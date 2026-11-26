# 📱 Gyan Yatra YouTube Studio — Mobile Application Architecture

## 🎯 Project Overview
This mobile application converts the complete **Gyan Yatra YouTube Studio** web experience into a standalone, professional Android mobile application while keeping the existing website 100% unchanged.

---

## 🎨 Visual Design Specifications (Reference Matching)
- **Background:** Clean White (`#FFFFFF`) / Soft Canvas (`#F8FAFC`)
- **Accent Palette:** Purple (`#7C3AED`) and Royal Blue (`#2563EB`) gradients
- **Branding:** YouTube Red Logo, Channel Avatar, "Gyan Yatra YouTube Studio"
- **Typography:** Noto Sans Gujarati & Outfit (Bold, legible, Gujarati-first)
- **Top Header:** Hamburger Menu (left), YouTube Red Play Logo, Channel Title, Notification Bell with live count (right)
- **Layout:** High-density 2-Column Rounded Rectangular Feature Card Grid with soft modern shadows
- **Bottom Navigation:** Quick access to Home, Idea, Voice, and Video Editor + Android system gesture bar

---

## 📋 Website-to-Mobile Feature Mapping (10 Core Tools)

| # | Mobile Feature Card | Corresponding Website Tool | Primary Backend APIs & Actions | Mobile Optimization |
|---|---------------------|----------------------------|--------------------------------|---------------------|
| 1 | **Video Idea** | `#topics` / `#home` | `POST /api/topics/subtopics-search`<br>`POST /api/topics/viral-research`<br>`GET /api/topics/trending` | 48-Hour YouTube Studio screenshot analysis prompt + 4-5 Sub-topics live search explorer |
| 2 | **Slide બનાવો** | `#slideprompts` / `#slideeditor` | `POST /api/research/analyze-file`<br>`POST /api/research/slide-deck-prompt` | Clean White 16:9 slide presentation prompts, PDF upload & visual slide deck cards |
| 3 | **Script લખો** | `#scriptwriter` | `POST /api/scripts/generate`<br>`POST /api/scripts/save` | 4-Section Gujarati video script generation (Hook, Rules, Breakdown, Conclusion) |
| 4 | **Voice બનાવો** | `#myvoice` / SlideVoiceStudio | `POST /api/voice/synthesize`<br>`POST /api/voice/enhance`<br>`POST /api/voice/upload-slide-audio` | Slide-by-slide audio recorder, mic controls, AI Crystal Noise cleaner (-16 LUFS) |
| 5 | **Video Editing** | `#videoeditor` | `POST /api/voice/merge-video`<br>`POST /api/voice/upload-video` | 5-step video production pipeline, slide-audio synchronization, 1080p MP4 export |
| 6 | **Thumbnail** | `#seo` / `#thumbnails` | `POST /api/thumbnails/concepts` | High-CTR thumbnail concept generator, contrasting color palettes & Gujarati text overlays |
| 7 | **SEO & Tags** | `#seodescription` | `POST /api/seo/generate` | High-CTR video titles, 5000-character descriptions, viral keyword tags & hashtags |
| 8 | **Facebook Upload** | Cross-platform publisher | Direct video sharing & package exporter | Square (1:1) and 16:9 format guidelines, Gujarati caption & hashtags, scheduled upload tips |
| 9 | **YouTube Community** | Community Engagement | Post & Poll Generator | Audience polls, quiz questions, announcement posts & engagement teasers |
| 10 | **YouTube Shorts Upload**| Shorts Vertical Studio | 9:16 Video Exporter & Scriptwriter | 60-second viral vertical script, 3-second hook, bold captions & Shorts tags |

---

## 🚀 How to Preview the Mobile Application
1. **Interactive HTML/JS Preview:**
   Open [mobile-app/index.html](file:///c:/Users/curio/StudioProjects/my%20channel%20idea/mobile-app/index.html) in Google Chrome or any browser.
   - Switch between device viewports: **Pixel 7 (390×844)**, **Galaxy S23+ (412×915)**, and **Compact Android (360×800)**.
   - Tap any of the 10 feature cards to navigate into its dedicated screen.
   - Tap the hamburger menu (☰) to test the slide-out navigation drawer with channel metrics.
   - Tap the notification bell (🔔) to view studio alerts.
   - Test live button interactions (copying prompts, generating subtopics, recording voice mockups, noise cleaning).

2. **Native Android Codebase:**
   The Flutter codebase resides in `android_app/` with full separation from website assets.

---

## 🛑 Strict Compliance Confirmation
- ✅ **Existing Website Unchanged:** Zero files modified in `public/`, `server/`, `data/`, or `package.json`.
- ✅ **No Premature APK:** As per Phase 3, APK generation is **strictly paused** until user inspection and approval of the preview.
