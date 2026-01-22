# MeetLens Redesign: Premium Monochrome Transcription Interface

**Vibe:** Minimalist, Professional, High-Contrast, typographic-focused, "Monochrome Premium".

Create a sophisticated desktop application interface for "MeetLens," a real-time meeting transcription and translation tool. The design must strictly adhere to a monochrome palette (Black, White, Grayscale) with **Red (#D32F2F)** used *only* for destructive actions (like "End Meeting").

## Layout Structure
The app uses a clean 3-column layout or a Sidebar + Main Content structure.

### 1. Sidebar (Left)
*   **Background:** `#F7F7F7` (Light Gray).
*   **Content:**
    *   **Header:** "MeetLens" logo or text (H2 style, Inter font, weight 500).
    *   **"New Meeting" Button:** A prominent button, possibly outlined or distinct from the list.
    *   **Meeting History List:** A list of past meetings. Each item should show the date/time and a brief title.
        *   *Active Item:* White background (`#FFFFFF`) with a subtle border or shadow to indicate selection.
        *   *Inactive Items:* Text Secondary (`#6B6B6B`).
        *   *Delete Action:* A subtle icon to delete a meeting history item.

### 2. Top Navigation (Header)
*   **Background:** `#FFFFFF` (White).
*   **Border:** 1px solid `#E3E3E3` at the bottom.
*   **Elements:**
    *   **Status Indicators:** A pill or badge showing "Connected" or "Recording" state.
    *   **Language Selectors:** Dropdowns or simple text buttons to switch "App Language" and "Translation Language".
    *   **Primary Action:** A "Start/Stop Recording" button.
        *   *Start:* Primary Black Button (`#000000` bg, `#FFFFFF` text).
        *   *Stop:* Danger Red Button (`#D32F2F` bg, `#FFFFFF` text) or a specific "End Meeting" style.

### 3. Main Transcript Area (Center - Focus)
*   **Background:** `#FFFFFF` (White) or `#F7F7F7` depending on the container style.
*   **Header:** Title "Transcript" with action buttons ("Generate Summary", "Clear") aligned to the right.
    *   *Generate Summary:* Primary Black Button styling.
    *   *Clear:* Text button or secondary outline button.
*   **The Transcript Feed (The Core Experience):**
    *   **Row Layout:** Each transcript entry is a block.
        *   **Original Text (EN):** Smaller, secondary color (`#6B6B6B`), 13-14px.
        *   **Translated Text (TR):** Larger, primary color (`#111111`), 15-16px, bold or regular weight.
        *   **Spacing:** Generous padding (16px+) between rows.
    *   **Active Line:** The current line being spoken should be highlighted (e.g., a vertical black bar on the left, pure white background if the list is gray).

### 4. Summary Panel (Right)
*   **Background:** `#FFFFFF` (White).
*   **Content:**
    *   **Title:** "Meeting Summary".
    *   **State:**
        *   *Empty:* Placeholder text explaining how to generate a summary.
        *   *Loading:* A minimal spinner or skeleton loader.
        *   *Populated:* The structured summary text (bullet points, key takeaways).
    *   **Typography:** highly readable, left-aligned body text (`#111111`).

## Design Language System (DLS) Rules
*   **Font:** Inter, SF Pro, or a similar geometric sans-serif.
*   **Colors:**
    *   Backgrounds: `#F7F7F7` (App), `#FFFFFF` (Cards/Panels).
    *   Text: `#111111` (Primary), `#6B6B6B` (Secondary).
    *   Borders: `#E3E3E3`.
    *   Accents: `#000000` (Primary Interactive), `#D32F2F` (Destructive ONLY).
*   **Spacing:** Use an 8pt grid (8px, 16px, 24px, 32px).
*   **Radius:** Soft rounded corners (8-10px) for buttons and cards.
*   **Shadows:** Minimal or none; prefer borders and contrast for separation.

## Interaction "Vibe"
The interface should feel "calm" and "stable" to not distract the user during a live meeting. Avoid clutter.
