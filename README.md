# DASASURYA
### AI Adaptive Learning System

DASASURYA is an AI-powered adaptive learning platform designed to make learning more personal, accessible, and engaging.

Every learner has a different way of understanding things. Some learn quickly, while others need more time, examples, or a different explanation. DASASURYA aims to address this by adapting the learning experience to each individual's needs, interests, age, and learning progress.

The platform brings AI assistance and personalized learning together to help users understand concepts, build knowledge, practice skills, and track their improvement.

## About the Project

Traditional learning systems often provide the same content and learning path to everyone. However, not every learner has the same background, knowledge level, or learning speed.

DASASURYA aims to make this experience more flexible through AI-based assistance and adaptive learning.

Users can interact with the AI assistant, explore different knowledge areas, follow personalized learning paths, and monitor their progress through a single platform.

## Key Features

- **AI Learning Assistant:** Helps learners understand topics, ask questions, and receive explanations.
- **Adaptive Learning:** Supports personalized learning paths based on individual needs and progress.
- **Age-Based Learning:** Organizes learning experiences according to the learner's age and level.
- **Multilingual Learning:** Aims to make learning accessible across different languages, starting with English and Tamil.
- **Learning Dashboard:** Provides access to learning activities, goals, and progress.
- **Knowledge Dimensions:** Organizes learning across multiple areas of knowledge.
- **Quizzes and Assessments:** Helps learners practice and evaluate their understanding.
- **Progress Tracking:** Helps users monitor completed activities and learning development.
- **Wellness Module:** Includes educational wellness activities and guided self-reflection.
- **User Management:** Supports user profiles and role-based access.
- **Learning Reminders:** Helps learners maintain consistent learning habits.

## Ten Knowledge Dimensions

DASASURYA explores learning through ten interconnected dimensions:

| Dimension | Focus |
|---|---|
| Knowledge | Academic and general knowledge |
| Language | Communication and language learning |
| Music | Musical understanding and creativity |
| Wellness | Wellbeing and healthy routines |
| Strategy | Logical thinking and problem-solving |
| Vision | Observation and visual understanding |
| Voice | Speech and communication |
| Astronomy | Space and scientific exploration |
| Traditional Knowledge | Cultural and traditional learning |
| Governance | Society, leadership, and civic awareness |

## Technology Stack

The project uses a modern web development stack.

The exact technologies and versions are documented in the project configuration.

- **Frontend:** React
- **Development Tool:** Vite
- **Programming Language:** TypeScript
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **AI Integration:** Google Gemini API
- **Backend and Database:** Supabase (where configured)
- **Version Control:** Git and GitHub
- **Deployment:** Vercel

## How It Works

1. A learner creates an account and sets up their profile.
2. The learner selects their preferred language and learning interests.
3. DASASURYA uses the available profile and learning information to personalize the experience.
4. The AI assistant helps explain topics and answer questions.
5. Learners explore modules and complete learning activities.
6. Assessments help evaluate their understanding.
7. Learning progress helps guide future recommendations.

## Project Goals

The main goals of DASASURYA are:

- Make quality learning more accessible.
- Support different learning speeds and knowledge levels.
- Encourage independent learning.
- Make AI useful in everyday education.
- Support multilingual learners.
- Connect different areas of knowledge in one learning environment.
- Encourage continuous personal development.

## Getting Started

### Prerequisites

Before running the project, install:

- Node.js
- npm
- Git

### Installation

Clone the repository:

```bash
git clone https://github.com/sandeepelangovan75/DASASURYA.git
```

Move into the project directory:

```bash
cd DASASURYA
```

Install dependencies:

```bash
npm install
```

Create a `.env.local` file in the project root and configure the environment variables required by the application.

Example:

```env
GEMINI_API_KEY=your_gemini_api_key
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Use only the variables required by your actual application. Never commit real API keys or secret credentials to GitHub.

Start the development server:

```bash
npm run dev
```

Open the local development URL displayed in your terminal.

## Project Structure

The application is organized into reusable frontend components, application pages, services, and supporting configuration files.

The exact folder structure may evolve as the project develops.

```text
DASASURYA/
├── components/
├── pages/
├── services/
├── public/
├── src/
├── package.json
├── vite.config.ts
├── tsconfig.json
├── .env.example
└── README.md
```

Refer to the actual repository structure for the current implementation.

## Security and Privacy

DASASURYA is designed with user privacy and responsible access in mind.

- Authentication should be handled securely.
- Passwords must never be stored in plaintext.
- API credentials should be kept outside public source code.
- Database access should follow appropriate security policies.
- Administrative features should be restricted to authorized users.
- Age-appropriate safeguards should be considered for younger learners.

## Current Development Status

DASASURYA is under active development.

The project is being improved with a focus on functional AI assistance, adaptive learning, multilingual accessibility, and a consistent user experience.

Some features may still be under development. The repository will be updated as implementation and testing progress.

## Future Improvements

Planned areas of improvement include:

- Expanded language support.
- More personalized learning recommendations.
- Improved learning analytics.
- Additional interactive learning modules.
- Enhanced accessibility.
- More learning dimensions and activities.
- Improved AI-assisted assessments.

## Hackathon

DASASURYA is being developed for the **Meta Global AI Developer Hackathon 2026**.

The project focuses on applying AI to a real-world educational challenge by making learning more personalized and accessible.

## Open Source

This project is shared publicly to support learning, collaboration, and further development.

Contributions, suggestions, and feedback are welcome.

## Author

**Sandeep E**

GitHub: [@sandeepelangovan75](https://github.com/sandeepelangovan75)

---

*DASASURYA — Making learning more personal, accessible, and meaningful.*
