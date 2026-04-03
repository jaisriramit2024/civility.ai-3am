📌 Civility.AI — Content Moderation Platform

Civility.AI is a scalable, multi-model content moderation platform designed to detect and filter harmful content across text, images, and videos. The system leverages advanced AI models and a custom NLP pipeline to handle multilingual and code-mixed inputs, including Tanglish (Tamil–English).

🚀 Features

🔍 Multi-Modal Moderation
Analyzes text, images, and video content using integrated AI models (OpenAI + Claude)

🧠 Advanced NLP Pipeline
6-stage processing pipeline for:
Text normalization
Language detection
Tanglish handling (Tamil-English mix)
Obfuscation detection (e.g., altered/slang words)
Toxicity classification
Context-aware filtering

🌐 Tanglish Support
Handles code-mixed language inputs commonly used in social media

🛡️ Bypass & Obfuscation Detection
Identifies attempts to evade moderation using altered spellings and symbols

⚙️ Scalable Backend Architecture
Built with Django REST Framework for high-performance API handling

🗄️ Hybrid Database Integration
MySQL for structured data
MongoDB for unstructured/moderation logs

🏗️ Tech Stack
Backend: Python, Django, Django REST Framework
Frontend: React
AI Integration: OpenAI API, Claude API
Databases: MySQL, MongoDB

📡 API Capabilities
Content submission for moderation (text/image/video)
Real-time toxicity scoring
Classification labels (safe, offensive, harmful, etc.)
Moderation logs and analytics

📈 Use Cases
Social media platforms
Online communities & forums
Content-driven applications
Chat applications and AI bots

🧩 Future Enhancements
Real-time streaming moderation
Dashboard for analytics and insights
Custom moderation rule engine
Support for additional regional languages
