# DeepfakeDetector Frontend

Modern, responsive React/Next.js frontend for the AI deepfake and morphed video detection system.

## Features

- **Drag-and-Drop Upload**: Instagram Reels-style upload interface
- **Live Preview**: Video player showing uploaded content
- **Real-time Processing**: Live progress updates during analysis
- **Beautiful Results**: Confidence bars, classification badges, and detailed analysis
- **Responsive Design**: Works on desktop and tablet devices
- **Dark Mode**: Modern dark UI with gradient backgrounds

## Project Structure

```
frontend/
├── app/
│   ├── components/
│   │   ├── UploadBox.tsx        # Drag-and-drop upload component
│   │   ├── VideoPreview.tsx     # Video player component
│   │   ├── LoadingAnimation.tsx # Processing animation
│   │   ├── Results.tsx          # Results display
│   │   └── Header.tsx           # Header with branding
│   ├── utils/
│   │   └── api.ts               # API client functions
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Main page
│   └── globals.css              # Global styles
├── package.json
├── next.config.js
├── tsconfig.json
├── tailwind.config.js
└── postcss.config.js
```

## Installation

```bash
cd frontend
npm install
# or
yarn install
```

## Development

```bash
npm run dev
# or
yarn dev
```

The app will be available at `http://localhost:3000`

## Building for Production

```bash
npm run build
npm start
```

## Technologies

- **Next.js 14** - React framework
- **React 18** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Axios** - HTTP client

## Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

## Features in Detail

### Upload Component
- Drag and drop support
- Click to select files
- Format validation
- Size limitation indicators

### Video Preview
- HTML5 video player
- Auto-play (muted)
- Full controls
- File name display

### Loading Animation
- Progress bar
- Percentage display
- Step indicators
- Smooth animations

### Results Display
- Classification badge (Likely Deepfake / Likely Real / Suspicious)
- Three confidence scores with visual bars
- Frame count information
- Analysis recommendation
