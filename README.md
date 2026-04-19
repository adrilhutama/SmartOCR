# SmartOCR 🚀
**SmartOCR** is a professional, lightning-fast, and privacy-focused client-side web application designed to transform complex work schedule images and raw text into clean, structured data tables.

Built with performance and user experience in mind, SmartOCR allows users to process schedules 100% offline in their browser, ensuring that sensitive data never leaves their local machine.

---

## ✨ Key Features
- **🚀 Advanced OCR Engine**: Powered by Tesseract.js using the `tessdata_best` models for high-accuracy table recognition.
- **🇮🇩 Bilingual Support**: Optimized for both English and Indonesian names/terms.
- **⚡ Instant Text Parsing**: Support for direct text pasting (Ctrl+V) from sources like WhatsApp or emails with instant table generation.
- **✏️ Live Inline Editing**: Fix typos directly in the results table. Includes smart dropdowns for Shift selection (Morning, Afternoon, Night).
- **📋 One-Click Export**: Copy cleaned data in a format perfectly ready for Excel or Google Sheets.
- **🔒 Privacy First**: Zero server-side processing. All data is processed locally in your browser.
- **🌑 Premium Dark UI**: A modern, responsive dashboard with a split-panel workflow and smooth animations.
- **🧹 Auto-Cleaning**: Automatically handles name casing, squished words, and noise symbols (`_`, `-`, `@`).

---

## 🛠️ Technology Stack
- **Structure**: Semantic HTML5
- **Styling**: Vanilla CSS (Custom Variable System)
- **Logic**: Vanilla JavaScript (ES6+)
- **OCR Engine**: [Tesseract.js](https://tesseract.projectnaptha.com/)

---

## 🚀 Installation & Local Usage
Since this is a static web application, no complex installation is required.

1. **Clone or Download** this repository.
2. Ensure the `tessdata/` folder contains the required `.traineddata.gz` files.
3. Open `index.html` in your browser.
   > **Note**: Due to browser CORS policies with local file access (`file:///`), it is recommended to run this using a simple local server (e.g., VS Code Live Server or `python -m http.server`).

---

## 📖 How to Use
1. **Input**: Drag and drop a screenshot of a schedule, or paste text directly into the application.
2. **Process**: If using an image, click **Process** to trigger the OCR engine.
3. **Review**: The structured table will appear on the right panel.
4. **Edit**: Click any name or time to fix minor OCR errors. Use the dropdown to adjust shifts.
5. **Export**: Click **Copy Data** and paste it directly into your spreadsheet.

---

## 📜 License
This project is open-source. Feel free to contribute or modify it for your own needs.

---
*Created with ❤️ by Antigravity AI*
