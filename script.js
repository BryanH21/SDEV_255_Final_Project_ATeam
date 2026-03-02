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

// Cache courses for searching on courses.html
let allCoursesCache = [];

function renderCoursesList(courses) {
  const courseList = document.getElementById("courseList");
  if (!courseList) return;

  if (!Array.isArray(courses) || courses.length === 0) {
    courseList.innerHTML = '<p class="muted">No matching courses.</p>';
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

            ${localStorage.getItem("role") === "teacher"
              ? `
                <a class="btn small" href="editCourse.html?id=${course.id}">Edit</a>
                <button class="btn small danger" type="button" data-delete-id="${course.id}">Delete</button>
              `
              : `
                <button class="btn small" type="button" data-enroll-id="${course.id}">Enroll</button>
              `
            }
          </div>
        </div>
      `;
    })
    .join("");
}

function wireCourseSearch() {
  const input = document.getElementById("courseSearch");
  if (!input) return; // Only on courses.html

  // Prevent double-binding if loadCoursesPage() runs again
  if (input.dataset.bound === "true") return;
  input.dataset.bound = "true";

  input.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase();

    if (!q) {
      renderCoursesList(allCoursesCache);
      return;
    }

    const filtered = allCoursesCache.filter((c) => {
      const name = String(c.name || "").toLowerCase();
      const subject = String(c.subject || "").toLowerCase();
      // Support simple searches like "web" or "cs"
      return name.includes(q) || subject.includes(q);
    });

    renderCoursesList(filtered);
  });
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
      allCoursesCache = [];
      wireCourseSearch();
      courseList.innerHTML = '<p class="muted">No courses yet. Use “Add Course” to create one.</p>';
      return;
    }

    // Cache for searching
    allCoursesCache = Array.isArray(courses) ? courses : [];

    // Ensure search input is wired (only on courses.html)
    wireCourseSearch();

    // Render full list initially
    renderCoursesList(allCoursesCache);
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
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
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
        const delRes = await fetch(`${API_BASE}/api/courses/${id}`, {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${localStorage.getItem("token")}`
          }
        });
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
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
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

// =========================
// LOGIN (login.html)
// =========================
function wireLoginPage() {
  const form = document.getElementById("loginForm");
  const msg = document.getElementById("loginMsg");
  if (!form) return; // Only run on login.html

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (msg) msg.textContent = "";

    const email = form.elements.email.value.trim();
    const password = form.elements.password.value;

    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (msg) msg.textContent = data.error || "Login failed.";
        return;
      }

      // Save session info
      localStorage.setItem("token", data.token);
      localStorage.setItem("role", data.role);
      localStorage.setItem("email", data.email);

      // Redirect to courses
      window.location.href = "courses.html";
    } catch (err) {
      if (msg) msg.textContent = "Login failed: backend not reachable.";
    }
  });
}

// =========================
// MY SCHEDULE (mySchedule.html)
// =========================
async function loadMySchedulePage() {
  const container = document.getElementById("scheduleList");
  if (!container) return; // Only run on mySchedule.html

  const token = localStorage.getItem("token");
  if (!token) {
    container.innerHTML = "<p class='muted'>Please login first.</p>";
    return;
  }

  container.innerHTML = "<p class='muted'>Loading...</p>";

  try {
    const res = await fetch(`${API_BASE}/api/me/schedule`, {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const msg = data?.error || "Failed to load schedule.";
      container.innerHTML = `<p class='muted'>${escapeHtml(msg)}</p>`;
      return;
    }

    const courses = Array.isArray(data) ? data : [];

    if (courses.length === 0) {
      container.innerHTML = "<p class='muted'>You are not enrolled in any courses.</p>";
      return;
    }

    container.innerHTML = courses
      .map((c) => {
        const name = escapeHtml(c.name);
        const description = escapeHtml(c.description);
        const subject = escapeHtml(c.subject);
        const credits = escapeHtml(c.credits);

        return `
          <div class="course-card">
            <h3>${name}</h3>
            <p class="muted">${description}</p>
            <p><strong>Subject Area:</strong> ${subject}</p>
            <p><strong>Credits:</strong> ${credits}</p>

            <div class="course-actions">
              <button class="btn small danger" type="button" data-drop-id="${c.id}">Drop</button>
            </div>
          </div>
        `;
      })
      .join("");
  } catch (err) {
    container.innerHTML = "<p class='muted'>Backend not reachable.</p>";
  }
}

// Event delegation for drop buttons on the My Schedule page
document.addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-drop-id]");
  if (!btn) return;

  const courseId = btn.getAttribute("data-drop-id");
  if (!courseId) return;

  const token = localStorage.getItem("token");
  if (!token) {
    alert("Please login first.");
    window.location.href = "login.html";
    return;
  }

  const ok = confirm("Drop this course from your schedule?");
  if (!ok) return;

  try {
    const res = await fetch(`${API_BASE}/api/me/schedule/${courseId}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    if (res.status !== 204) {
      const maybeJson = await res.json().catch(() => null);
      const msg = maybeJson?.error || `Drop failed (HTTP ${res.status})`;
      throw new Error(msg);
    }

    // Refresh schedule list
    await loadMySchedulePage();
  } catch (err) {
    alert(`Drop failed: ${err.message}`);
  }
});

// Event delegation for enroll buttons on the courses list
document.addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-enroll-id]");
  if (!btn) return;

  const courseId = btn.getAttribute("data-enroll-id");
  if (!courseId) return;

  const token = localStorage.getItem("token");
  if (!token) {
    alert("Please login first.");
    window.location.href = "login.html";
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/me/schedule/${courseId}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    if (res.status !== 204) {
      const maybeJson = await res.json().catch(() => null);
      const msg = maybeJson?.error || `Enroll failed (HTTP ${res.status})`;
      throw new Error(msg);
    }

    alert("Enrolled! Check My Schedule.");
  } catch (err) {
    alert(`Enroll failed: ${err.message}`);
  }
});

// Event delegation for delete buttons on the courses list
document.addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-delete-id]");
  if (!btn) return;

  const id = btn.getAttribute("data-delete-id");
  if (!id) return;

  const ok = confirm("Delete this course?");
  if (!ok) return;

  try {
    const res = await fetch(`${API_BASE}/api/courses/${id}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${localStorage.getItem("token")}`
      }
    });

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
wireLoginPage();
loadMySchedulePage();