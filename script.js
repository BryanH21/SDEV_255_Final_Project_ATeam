// Frontend API base URL
// While testing locally, backend runs on http://localhost:3000
// After you deploy to Glitch, replace this with your Glitch "live" URL.
const API_BASE = "http://localhost:3000";

// Helper: safely escape text for HTML output (prevents accidental HTML injection)
function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function loadCoursesPage() {
  const courseList = document.getElementById("courseList");
  if (!courseList) return; // Only run on courses.html

  courseList.innerHTML = '<p class="muted">Loading courses...</p>';

  try {
    const res = await fetch(`${API_BASE}/api/courses`);
    if (!res.ok) throw new Error(`Request failed (HTTP ${res.status})`);

    const courses = await res.json();

    if (!Array.isArray(courses) || courses.length === 0) {
      courseList.innerHTML = '<p class="muted">No courses yet. Use “Add Course” to create one.</p>';
      return;
    }

    courseList.innerHTML = courses
      .map((course) => {
        const name = escapeHtml(course.name);
        const subject = escapeHtml(course.subject);
        const description = escapeHtml(course.description);
        const credits = escapeHtml(course.credits);

        return `
          <div class="course-card">
            <h3>${name}</h3>
            <p><strong>Subject Area:</strong> ${subject}</p>
            <p><strong>Credits:</strong> ${credits}</p>
            <p class="muted">${description}</p>

            <div class="course-actions">
              <a class="btn small" href="courseInfo.html?id=${course.id}">View</a>
              <a class="btn small" href="editCourse.html?id=${course.id}">Edit</a>
              <button class="btn small danger" type="button" data-delete-id="${course.id}">Delete</button>
            </div>
          </div>
        `;
      })
      .join("");
  } catch (err) {
    courseList.innerHTML = `<p class="muted">Error loading courses: ${escapeHtml(err.message)}</p>`;
  }
}

// =========================
// ADD COURSE (addCourses.html)
// =========================
function wireAddCoursePage() {
  const form = document.getElementById("addCourseForm");
  if (!form) return; // Only run on addCourses.html

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const data = {
      name: form.elements.name.value.trim(),
      description: form.elements.description.value.trim(),
      subject: form.elements.subject.value.trim(),
      credits: Number(form.elements.credits.value)
    };

    // Basic front-end validation
    if (!data.name || !data.description || !data.subject || !Number.isFinite(data.credits)) {
      alert("Please fill out Course Name, Description, Subject Area, and Credits.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/courses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });

      if (!res.ok) {
        const maybeJson = await res.json().catch(() => null);
        const msg = maybeJson?.error || `Add failed (HTTP ${res.status})`;
        throw new Error(msg);
      }

      // Success: go back to the course list
      window.location.href = "courses.html";
    } catch (err) {
      alert(`Add failed: ${err.message}`);
    }
  });
}

// =========================
// COURSE DETAILS (courseInfo.html)
// =========================
async function loadCourseInfoPage() {
  const nameEl = document.getElementById("courseName");
  const descEl = document.getElementById("courseDescription");
  const subjEl = document.getElementById("courseSubject");
  const creditsEl = document.getElementById("courseCredits");
  const editLink = document.getElementById("editCourseLink");
  const deleteBtn = document.getElementById("deleteCourseBtn");

  // Only run on courseInfo.html
  if (!nameEl || !descEl || !subjEl || !creditsEl || !editLink || !deleteBtn) return;

  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  if (!id) {
    nameEl.textContent = "Missing course id";
    deleteBtn.disabled = true;
    return;
  }

  // Update Edit link to include id
  editLink.href = `editCourse.html?id=${encodeURIComponent(id)}`;

  try {
    const res = await fetch(`${API_BASE}/api/courses/${id}`);
    if (!res.ok) throw new Error(`Request failed (HTTP ${res.status})`);

    const course = await res.json();

    nameEl.textContent = course.name ?? "";
    descEl.textContent = course.description ?? "";
    subjEl.textContent = course.subject ?? "";
    creditsEl.textContent = course.credits ?? "";

    deleteBtn.addEventListener("click", async () => {
      const ok = confirm("Delete this course?");
      if (!ok) return;

      try {
        const delRes = await fetch(`${API_BASE}/api/courses/${id}`, { method: "DELETE" });
        if (delRes.status !== 204) {
          const maybeJson = await delRes.json().catch(() => null);
          const msg = maybeJson?.error || `Delete failed (HTTP ${delRes.status})`;
          throw new Error(msg);
        }

        window.location.href = "courses.html";
      } catch (err) {
        alert(`Delete failed: ${err.message}`);
      }
    });
  } catch (err) {
    nameEl.textContent = "Course not found";
    descEl.textContent = err.message;
    subjEl.textContent = "—";
    creditsEl.textContent = "—";
    deleteBtn.disabled = true;
  }
}

// =========================
// EDIT COURSE (editCourse.html)
// =========================
function wireEditCoursePage() {
  const form = document.getElementById("editCourseForm");
  if (!form) return; // Only run on editCourse.html

  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  if (!id) {
    alert("Missing course id.");
    window.location.href = "courses.html";
    return;
  }

  // Pre-fill the form with existing course data
  (async () => {
    try {
      const res = await fetch(`${API_BASE}/api/courses/${id}`);
      if (!res.ok) throw new Error(`Request failed (HTTP ${res.status})`);

      const course = await res.json();

      form.elements.name.value = course.name ?? "";
      form.elements.description.value = course.description ?? "";
      form.elements.subject.value = course.subject ?? "";
      form.elements.credits.value = course.credits ?? "";
    } catch (err) {
      alert("Course not found.");
      window.location.href = "courses.html";
    }
  })();

  // Submit updated data
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const data = {
      name: form.elements.name.value.trim(),
      description: form.elements.description.value.trim(),
      subject: form.elements.subject.value.trim(),
      credits: Number(form.elements.credits.value)
    };

    if (!data.name || !data.description || !data.subject || !Number.isFinite(data.credits)) {
      alert("Please fill out Course Name, Description, Subject Area, and Credits.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/courses/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });

      if (!res.ok) {
        const maybeJson = await res.json().catch(() => null);
        const msg = maybeJson?.error || `Update failed (HTTP ${res.status})`;
        throw new Error(msg);
      }

      // Success: go to the updated course details page
      window.location.href = `courseInfo.html?id=${encodeURIComponent(id)}`;
    } catch (err) {
      alert(`Update failed: ${err.message}`);
    }
  });
}

// Event delegation for delete buttons on the courses list
document.addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-delete-id]");
  if (!btn) return;

  const id = btn.getAttribute("data-delete-id");
  if (!id) return;

  const ok = confirm("Delete this course?");
  if (!ok) return;

  try {
    const res = await fetch(`${API_BASE}/api/courses/${id}`, { method: "DELETE" });

    // Our API returns 204 No Content on success.
    if (res.status !== 204) {
      const maybeJson = await res.json().catch(() => null);
      const msg = maybeJson?.error || `Delete failed (HTTP ${res.status})`;
      throw new Error(msg);
    }

    // Refresh the list
    await loadCoursesPage();
  } catch (err) {
    alert(`Delete failed: ${err.message}`);
  }
});

// Run page specific loaders
loadCoursesPage();
wireAddCoursePage();
loadCourseInfoPage();
wireEditCoursePage();