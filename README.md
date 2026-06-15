# BigQuery Release Notes Dashboard

An elegant, real-time web application built with **Python Flask** and **plain vanilla HTML, CSS, and JavaScript**. It fetches the latest Google Cloud BigQuery release notes, parses them into individual categorized updates, and allows you to instantly draft and customize tweets to share updates on Twitter/X.

---

## 🚀 Key Features

* **Real-time Ingestion:** Automatically retrieves and parses the official BigQuery release notes XML feed.
* **Granular Deconstruction:** Breaks down daily bulk updates into individual release cards, categorized by type (*Feature*, *Changed*, *Deprecated*, *Fixed*, *General*).
* **Smart Caching:** Employs a 5-minute memory cache to avoid rate-limiting and minimize load times.
* **Instant Filtering & Searching:** Filter updates by type or search details in real-time through client-side query indexing.
* **Twitter/X Integration:** Draft modal that formats update notes into tweet-friendly blocks (limiting characters, auto-adding hashtags, and launching Twitter's Web Intent compose box).
* **Premium Dark Mode Aesthetics:** Modern glassmorphic style featuring glowing cards, metric counter panels, and custom toast alerts.

---

## 📂 Project Structure

```text
agy-cli-projects/
├── app.py                 # Flask server with feed parsing and caching logic
├── templates/
│   └── index.html         # Frontend HTML structure & layout templates
├── static/
│   ├── style.css          # Glassmorphic dark theme stylesheet
│   └── app.js             # Client-side state, filtering, and modal orchestration
├── .gitignore             # Git exclusion parameters
├── README.md              # Project documentation
├── news.txt               # Plain text dump of current world news
└── summary.txt            # Highlight summary of current world news
```

---

## ⚙️ Setup and Installation

### 1. Prerequisites
Ensure you have **Python 3.x** and `pip` installed on your machine.

### 2. Install Dependencies
Install the required packages using pip:
```bash
pip install flask requests
```

### 3. Run the Application
Start the development server by executing the following command in the project root folder:
```bash
python app.py
```

The application will launch on:
👉 **[http://127.0.0.1:5000](http://127.0.0.1:5000)**

---

## 💡 How to Use

1. **View & Search:** Browse the latest release updates. Use the **Search bar** to find specific features or the **Type dropdown** to filter by updates type.
2. **Refresh Feed:** Click the **Refresh** button in the header. The spinner will rotate as it requests a fresh pull of the XML feed from Google.
3. **Share Updates:**
   - Click **Draft Tweet** on any release card.
   - A modal styled like a tweet draft card will pop up.
   - Tailor the text (keeps you within the 280-character limit).
   - Click **Share on X** to open a new tab directly in Twitter/X with your pre-filled tweet.

---

## 📄 License
This project is licensed under the MIT License - see the LICENSE file for details.