# MeetLens Design Language System (DLS)

## 1. Introduction

The MeetLens Design Language System defines the visual style, interaction patterns, and UI rules that ensure a consistent, premium, and accessible user experience across all platforms. The system is built on a monochrome, high‑contrast aesthetic focusing on clarity, minimalism, and functional elegance.

This DLS applies to all surfaces of the MeetLens product, including mobile, desktop, and web.

---

## 2. Core Design Principles

### **2.1 Simplicity**

MeetLens prioritizes what users need in the moment. Visual noise is minimized, and every UI element has a clear purpose.

### **2.2 Focus**

Live transcription requires fast comprehension. The design emphasizes the current line, reducing cognitive load and creating a calm reading rhythm.

### **2.3 Monochrome Premium**

No color-based branding. Black and white form the core identity. Small red accents are used exclusively for destructive actions.

### **2.4 Accessibility & Legibility**

High contrast ratios, strict typography rules, and predictable spacing make the interface readable in all lighting environments.

---

## 3. Color System

MeetLens uses a strictly monochrome palette with minimal accents.

### **3.1 Neutral Palette**

| Name           | Hex       | Usage                                        |
| -------------- | --------- | -------------------------------------------- |
| Background     | `#F7F7F7` | App background, neutral surface behind cards |
| Surface (Card) | `#FFFFFF` | Panels, cards, content backgrounds           |
| Border         | `#E3E3E3` | Dividers, component outlines                 |
| Text Primary   | `#111111` | Main body text                               |
| Text Secondary | `#6B6B6B` | Supporting text, timestamps                  |
| Text Disabled  | `#A3A3A3` | Disabled components                          |

### **3.2 Accent Colors**

| Name               | Hex       | Usage                                   |
| ------------------ | --------- | --------------------------------------- |
| Primary (Black)    | `#000000` | Primary actions, key brand identity     |
| On Primary (White) | `#FFFFFF` | Text on black buttons                   |
| Danger Red         | `#D32F2F` | Destructive actions (e.g., End Meeting) |

### **3.3 Color Rules**

* Black is reserved for interactive emphasis (primary buttons).
* Red is used **only** for destructive actions.
* No other colors should appear in the UI.
* Grayscale forms the entire base aesthetic.

---

## 4. Typography

MeetLens uses a clean, modern geometric sans-serif font (Inter, SF Pro, or equivalent).

### **4.1 Type Scale**

| Style    | Size     | Weight | Usage                        |
| -------- | -------- | ------ | ---------------------------- |
| H1       | 28 px    | 600    | Welcome screen titles        |
| H2       | 22 px    | 500    | Section headers              |
| Subtitle | 17 px    | 500    | Live screen labels           |
| Body     | 15–16 px | 400    | Main text, translation lines |
| Caption  | 13–14 px | 400    | Timestamps, metadata         |

### **4.2 Typographic Behavior**

* Headlines use tighter line height (1.1–1.2).
* Body text uses 1.4–1.6 line height for readability.
* All text must be left-aligned for optimal scanning.
* Avoid center alignment except for introductory screens.

---

## 5. Spacing & Layout System

MeetLens uses an 8‑point spacing grid.

### **5.1 Core Spacing Units**

* XS = 4 px
* S = 8 px
* M = 16 px
* L = 24 px
* XL = 32 px

### **5.2 Containers & Max Width**

* Mobile content width: full width with 16 px horizontal padding.
* Desktop max content column: 600–700 px.
* White space is generous to maintain a premium feel.

### **5.3 Dividers & Sections**

* Use 1 px border (`#E3E3E3`).
* Use spacing, not borders, to separate conceptual sections.

---

## 6. Components

This section defines reusable UI components.

### **6.1 Primary Button**

* Background: `#000000`
* Text: `#FFFFFF`
* Radius: 8–10 px
* Height: 48 px (mobile), 44 px (desktop)
* Hover: `#111111`
* Disabled: background `#E5E5E5`, text `#A3A3A3`

### **6.2 Secondary Button (Outline)**

* Background: transparent
* Border: 1 px solid `#111111`
* Text: `#111111`
* Hover: `#F5F5F5`

### **6.3 Tertiary Button (Text)**

* Text: `#6B6B6B`
* No borders or background

### **6.4 Transcript Row**

Each transcript entry consists of two lines:

* **Original line (EN):** 13–14 px, color `#6B6B6B`
* **Translation line (TR):** 15–16 px, color `#111111`
* Spacing: 4–6 px between lines
* Timestamp optional on left or inline

### **6.5 Highlight Row (Current Line)**

* Background: `#FFFFFF`
* Left indicator: 2 px black vertical bar
* Translation line uses slightly bolder weight
* Soft shadow optional for focus

### **6.6 AppBar**

* Background: white
* Border bottom: 1 px `#E3E3E3`
* Title: caption or subtitle style
* Supports back button + settings icon

### **6.7 Bottom Control Bar**

Contains: Pause / Duration / End Meeting.

* Background: white
* Border top: 1 px `#E3E3E3`
* End Meeting uses Danger button style

---

## 7. Interaction Rules

### **7.1 Live Transcription Behavior**

* Only the last few lines are shown prominently.
* Auto-scroll moves the current line to the center.
* If user scrolls upward, auto-scroll pauses.
* A floating "Jump to Now" chip appears.
* Returning to live view re-enables auto-scroll.

### **7.2 Animation Principles**

* Duration: 180–220 ms
* Easing: smooth, subtle (ease-out)
* No bouncing or playful animations; premium and minimal.

### **7.3 Button Interaction States**

* Primary button darkens when pressed.
* Outline button darkens slightly on hover.
* Tertiary text darkens to `#111111` when pressed.

---

## 8. Accessibility Guidelines

* Text contrast must meet WCAG AA minimums.
* Hit areas must be at least 44x44 px.
* Do not rely on color alone to indicate meaning.
* Red should only be used for destructive actions.

---

## 9. Platform Guidelines

### **9.1 Mobile**

* Full-width buttons
* Larger tap areas
* More vertical spacing

### **9.2 Desktop**

* Centered column up to 600–700 px
* Increased whitespace to reduce cognitive fatigue

---

## 10. Future Extensions

* Dark mode (mirror of current palette)
* Component API for Flutter widgets
* Brand motion system
* Voice visualization components

---

## 11. Summary

The MeetLens Design Language System defines a clean, premium, monochrome interface optimized for real-time transcription and translation. Consistency in spacing, typography, and component behavior ensures a cohesive user experience across all screens.

This document should be updated as new components and behaviors are introduced.