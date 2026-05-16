# Engineers Platform Backend

## Overview

Engineers Platform is an advanced engineering collaboration ecosystem built for students, developers, hackathon teams, recruiters, and engineering communities.

This backend powers:

* AI-powered personalized feeds
* Engineering reputation system
* Advanced trust scoring
* Smart search and filtering
* Engineering portfolios
* Hackathon ecosystem
* Team collaboration
* Referral system
* Affinity engine
* Recommendation engine
* Recruiter analytics
* Activity tracking
* Notifications system

---

# Tech Stack

## Backend

* Node.js
* Express.js
* TypeScript
* Prisma ORM
* PostgreSQL
* Zod Validation
* JWT Authentication

## Advanced Systems

* AI Feed Ranking Engine
* Affinity Scoring Engine
* Engineering Reputation System
* Trust Level Engine
* Smart Search Ranking
* Recommendation Engine

---

# Features

## Authentication

* JWT authentication
* Secure password hashing
* Role-based authorization

## Engineering Profiles

* Engineering portfolios
* Skills tracking
* Experience management
* Reputation scores
* Trust levels
* Engineering activity timeline

## Smart Search

Advanced filtering for:

* Colleges
* Departments
* Graduation years
* Skills
* Companies
* Projects
* Hackathons
* Collaboration preferences
* Referral availability

## AI Feed System

Personalized ranking using:

* Interaction memory
* User affinity
* Skill overlap
* Engagement signals
* Engineering authority
* Recency scoring

## Projects

* Team projects
* GitHub integration
* Verification system
* Engineering score calculation
* Project collaboration

## Teams

* Team creation
* Invitations
* Team reputation
* Collaboration system

## Hackathons

* Registrations
* Project submissions
* Judge assignments
* Submission evaluations
* Leaderboards
* Winner declarations

## Reputation System

* Reputation events
* Badge system
* Team reputation
* Advanced milestones

---

# Folder Structure

```bash
src/
 ┣ modules/
 ┃ ┣ auth/
 ┃ ┣ users/
 ┃ ┣ feed/
 ┃ ┣ affinity/
 ┃ ┣ search/
 ┃ ┣ projects/
 ┃ ┣ hackathons/
 ┃ ┣ reputation/
 ┃ ┣ engineering/
 ┃ ┣ analytics/
 ┃ ┗ ...
 ┣ shared/
 ┃ ┣ database/
 ┃ ┣ middleware/
 ┃ ┣ errors/
 ┃ ┗ utils/
 ┣ app.ts
 ┗ server.ts
```

---

# Installation

## Clone Repository

```bash
git clone https://github.com/AmitMehta0510/engineers-platform.git
```

## Install Dependencies

```bash
npm install
```

## Setup Environment Variables

Create `.env` file.

```env
DATABASE_URL=
JWT_SECRET=
PORT=
GITHUB_TOKEN=
```

## Run Prisma Migration

```bash
npx prisma migrate dev
```

## Generate Prisma Client

```bash
npx prisma generate
```

## Start Development Server

```bash
npm run dev
```

---

# Environment Variables Example

Create `.env.example`

```env
# =========================
# APP
# =========================
PORT=5000
NODE_ENV=development

# =========================
# DATABASE
# =========================
DATABASE_URL="postgresql://postgres:password@localhost:5432/engineers_platform"

# =========================
# AUTH
# =========================
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRES_IN=7d

# =========================
# GITHUB
# =========================
GITHUB_TOKEN=your_github_token

# =========================
# FRONTEND
# =========================
CLIENT_URL=http://localhost:3000
```

---

# API Documentation

Base URL:

```bash
http://localhost:5000/api/v1
```

---

# Authentication APIs

## Register

```http
POST /auth/register
```

## Login

```http
POST /auth/login
```

---

# Feed APIs

## Personalized Feed

```http
GET /feed
```

## Track Interaction

```http
POST /interactions
```

---

# Search APIs

## Global Search

```http
GET /search/global?q=react
```

## Search Users

```http
GET /search/users
```

Query Parameters:

* query
* collegeIds
* departmentIds
* graduationYears
* skills
* trustLevels
* openToWork
* acceptingCollaborators
* acceptingReferrals

## Search Projects

```http
GET /search/projects
```

## Search Hackathons

```http
GET /search/hackathons
```

---

# Team APIs

## Create Team

```http
POST /teams
```

## Delete Team

```http
DELETE /teams/:teamId
```

## Invite Member

```http
POST /teams/:teamId/invite
```

---

# Project APIs

## Create Project

```http
POST /projects
```

## Join Request

```http
POST /projects/:projectId/join-request
```

## Invite User

```http
POST /projects/:projectId/invite
```

---

# Hackathon APIs

## Create Hackathon

```http
POST /hackathons
```

## Register Team

```http
POST /hackathons/:hackathonId/register
```

## Submit Project

```http
POST /hackathons/:hackathonId/submit
```

## Review Registration

```http
PATCH /hackathons/registrations/:registrationId/review
```

## Assign Judge

```http
POST /hackathons/:hackathonId/judges
```

## Evaluate Submission

```http
POST /hackathons/submissions/:submissionId/evaluate
```

## Declare Winners

```http
POST /hackathons/:hackathonId/declare-winners
```

## Leaderboard

```http
GET /hackathons/:hackathonId/leaderboard
```

---

# Reputation APIs

## Leaderboard

```http
GET /reputation/leaderboard
```

## My Reputation

```http
GET /reputation/me
```

## Reputation History

```http
GET /reputation/me/history
```

---

# Engineering Portfolio APIs

## Get Engineering Portfolio

```http
GET /engineering/portfolio/:username
```

---

# Affinity APIs

## Rebuild Affinity Graph

```http
POST /affinity/rebuild
```

---

# Recruiter Analytics APIs

## Candidate Rankings

```http
GET /analytics/jobs/:jobId/rankings
```

## Recruiter Insights

```http
GET /analytics/recruiter-insights
```

---

# Security

* JWT authentication
* Protected routes
* Zod validation
* Secure password hashing
* Soft delete support
* Activity tracking
* Notification system

---

# Future Improvements

* Real-time chat with WebSockets
* AI project recommendations
* Resume parser
* GitHub auto-sync cron jobs
* Advanced analytics dashboard
* ElasticSearch integration
* Redis caching
* Docker deployment
* Kubernetes deployment
* CI/CD pipelines

---

# Author

Amit Mehta

GitHub:
[https://github.com/AmitMehta0510](https://github.com/AmitMehta0510)
