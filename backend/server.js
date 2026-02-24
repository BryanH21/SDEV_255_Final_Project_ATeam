const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

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
app.post("/api/courses", (req, res) => {
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
app.put("/api/courses/:id", (req, res) => {
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
app.delete("/api/courses/:id", (req, res) => {
  const id = Number(req.params.id);
  const beforeLength = courses.length;

  courses = courses.filter(c => c.id !== id);

  if (courses.length === beforeLength) {
    return res.status(404).json({ error: "Course not found" });
  }

  res.status(204).send();
});

/* START SERVER */
app.listen(PORT, () => {
  console.log(`API running on port ${PORT}`);
});