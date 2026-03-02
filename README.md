# CourseFlow (SDEV 255 Final Project)

CourseFlow is a simple Teacher/Student course management system.

## Features

- Teacher login: can create, edit, and delete courses (protected routes)
- Student login: can view courses and enroll/drop courses
- Student schedule page: shows enrolled courses
- JWT based authentication with role based authorization

## Tech

- Frontend: HTML/CSS/JavaScript (GitHub Pages)
- Backend: Node.js + Express (Render)
- Auth: JWT (jsonwebtoken) + bcryptjs
- Storage: in memory (demo project)

## Live URLs

- Frontend (GitHub Pages): https://bryanh21.github.io/SDEV_255_Final_Project_ATeam/
- Backend (Render): https://sdev-255-final-project-ateam-backend.onrender.com

## Demo Accounts

**Teacher**

- Email: teacher@test.com
- Password: Password1!

**Student**

- Email: student@test.com
- Password: Password1!

## API Endpoints (Backend)

- GET `/health` -> "ok"
- POST `/api/auth/login`
- GET `/api/courses`
- POST `/api/courses` (teacher only)
- PUT `/api/courses/:id` (teacher only)
- DELETE `/api/courses/:id` (teacher only)
- GET `/api/me/schedule` (auth)
- POST `/api/me/schedule/:courseId` (auth)
- DELETE `/api/me/schedule/:courseId` (auth)

## Run Locally

### Backend

```bash
cd backend
npm install
npm start
```
