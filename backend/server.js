const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// AUTH (Stage 2 - start)
// NOTE: For this checkpoint we use in memory demo users. Later you can move this into a database.

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

// Demo users (password is "Password1!")
const users = [
  {
    id: 1,
    email: "teacher@test.com",
    role: "teacher",
    passwordHash: bcrypt.hashSync("Password1!", 10)
  },
  {
    id: 2,
    email: "student@test.com",
    role: "student",
    passwordHash: bcrypt.hashSync("Password1!", 10)
  }
];

// POST /api/auth/login
// Body: { email, password }
// Response: { token, role, email }
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const user = users.find(u => u.email.toLowerCase() === String(email).toLowerCase());
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const ok = bcrypt.compareSync(String(password), user.passwordHash);
  if (!ok) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = jwt.sign(
    { sub: user.id, role: user.role, email: user.email },
    JWT_SECRET,
    { expiresIn: "2h" }
  );

  res.json({ token, role: user.role, email: user.email });
});

// AUTH MIDDLEWARE
function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const [type, token] = header.split(" ");

  if (type !== "Bearer" || !token) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    // attach user info to request
    req.user = {
      id: payload.sub,
      role: payload.role,
      email: payload.email
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

function requireTeacher(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  if (req.user.role !== "teacher") {
    return res.status(403).json({ error: "Teacher access required" });
  }
  next();
}

// In memory storage (Stage 1)
let courses = [
  {
    id: 1,
    name: "Web Development",
    description: "Learn the fundamentals of modern web development.",
    subject: "WEB",
    credits: 3
  },
  {
    id: 2,
    name: "Intro to Programming",
    description: "Build core programming foundations and problem-solving skills.",
    subject: "CS",
    credits: 4
  }
];

let nextId = 3;

/* GET ALL COURSES */
app.get("/api/courses", (req, res) => {
  res.json(courses);
});

/* GET ONE COURSE */
app.get("/api/courses/:id", (req, res) => {
  const id = Number(req.params.id);
  const course = courses.find(c => c.id === id);

  if (!course) {
    return res.status(404).json({ error: "Course not found" });
  }

  res.json(course);
});

/* CREATE COURSE */
app.post("/api/courses", requireAuth, requireTeacher, (req, res) => {
  const { name, description, subject, credits } = req.body;

  if (!name || !description || !subject || credits === undefined) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const newCourse = {
    id: nextId++,
    name: String(name).trim(),
    description: String(description).trim(),
    subject: String(subject).trim(),
    credits: Number(credits)
  };

  if (!Number.isFinite(newCourse.credits) || newCourse.credits < 1) {
    return res.status(400).json({ error: "Credits must be a valid number (>= 1)" });
  }

  courses.push(newCourse);
  res.status(201).json(newCourse);
});

/* UPDATE COURSE */
app.put("/api/courses/:id", requireAuth, requireTeacher, (req, res) => {
  const id = Number(req.params.id);
  const course = courses.find(c => c.id === id);

  if (!course) {
    return res.status(404).json({ error: "Course not found" });
  }

  const { name, description, subject, credits } = req.body;

  if (!name || !description || !subject || credits === undefined) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  course.name = String(name).trim();
  course.description = String(description).trim();
  course.subject = String(subject).trim();
  course.credits = Number(credits);

  if (!Number.isFinite(course.credits) || course.credits < 1) {
    return res.status(400).json({ error: "Credits must be a valid number (>= 1)" });
  }

  res.json(course);
});

/* DELETE COURSE */

app.delete("/api/courses/:id", requireAuth, requireTeacher, (req, res) => {
  const id = Number(req.params.id);
  const beforeLength = courses.length;

  courses = courses.filter(c => c.id !== id);

  if (courses.length === beforeLength) {
    return res.status(404).json({ error: "Course not found" });
  }

  res.status(204).send();
});

// STUDENT SCHEDULE (Stage 2)
// In memory schedule store: { userId: Set(courseId) }
const schedules = {}; // Ex: schedules[2] = new Set([1, 2])

// GET current user's schedule
app.get("/api/me/schedule", requireAuth, (req, res) => {
  const userId = req.user.id;

  const set = schedules[userId] || new Set();
  const courseIds = [...set];

  const myCourses = courses.filter(c => courseIds.includes(c.id));
  res.json(myCourses);
});

// Add a course to schedule
app.post("/api/me/schedule/:courseId", requireAuth, (req, res) => {
  const userId = req.user.id;
  const courseId = Number(req.params.courseId);

  const exists = courses.some(c => c.id === courseId);
  if (!exists) return res.status(404).json({ error: "Course not found" });

  if (!schedules[userId]) schedules[userId] = new Set();
  schedules[userId].add(courseId);

  return res.status(204).end();
});

// Drop a course from schedule
app.delete("/api/me/schedule/:courseId", requireAuth, (req, res) => {
  const userId = req.user.id;
  const courseId = Number(req.params.courseId);

  if (!schedules[userId]) schedules[userId] = new Set();
  schedules[userId].delete(courseId);

  return res.status(204).end();
});

/* START SERVER */
app.listen(PORT, () => {
  console.log(`API running on port ${PORT}`);
});