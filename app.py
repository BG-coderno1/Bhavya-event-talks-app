import os
import re
import xml.etree.ElementTree as ET
from datetime import datetime
import urllib.parse

from flask import Flask, jsonify, render_template, request
import requests

app = Flask(__name__)

# Cache structure to hold the releases
FEED_CACHE = {
    "data": None,
    "last_fetched": None
}

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

def clean_html(raw_html):
    """Remove HTML tags to get plain text for tweet previews."""
    cleanr = re.compile('<.*?>')
    cleantext = re.sub(cleanr, '', raw_html)
    # Replace multiple spaces/newlines with a single space
    cleantext = re.sub(r'\s+', ' ', cleantext)
    return cleantext.strip()

def parse_xml_feed(xml_content):
    """Parse the XML feed into individual release updates."""
    root = ET.fromstring(xml_content)
    # Atom namespace
    ns = {'atom': 'http://www.w3.org/2005/Atom'}
    
    entries = root.findall('atom:entry', ns)
    all_updates = []
    
    for entry in entries:
        # Title of the entry is typically the date, e.g., "June 12, 2026"
        entry_title = entry.find('atom:title', ns)
        entry_title = entry_title.text if entry_title is not None else "Unknown Date"
        
        updated_el = entry.find('atom:updated', ns)
        updated_date = updated_el.text if updated_el is not None else ""
        
        content_el = entry.find('atom:content', ns)
        content_html = content_el.text if content_el is not None else ""
        
        # Split content_html by <h3> tags
        parts = re.split(r'(<h3>.*?</h3>)', content_html)
        
        entry_updates = []
        if len(parts) <= 1:
            # If no <h3> found, treat whole block as one general update
            entry_updates.append({
                "type": "General",
                "content_html": content_html.strip()
            })
        else:
            # First element is content before the first <h3> (usually empty)
            first_part = parts[0].strip()
            if first_part:
                entry_updates.append({
                    "type": "General",
                    "content_html": first_part
                })
                
            for i in range(1, len(parts), 2):
                header_html = parts[i]
                body_html = parts[i+1] if i+1 < len(parts) else ""
                
                # Extract the text of the header, e.g. "<h3>Feature</h3>" -> "Feature"
                header_text = re.sub(r'<[^<]+?>', '', header_html).strip()
                
                entry_updates.append({
                    "type": header_text,
                    "content_html": body_html.strip()
                })
        
        # Assemble updates with parent entry metadata
        for idx, item in enumerate(entry_updates):
            plain_desc = clean_html(item["content_html"])
            
            # Format update structure
            all_updates.append({
                "id": f"{updated_date}_{idx}",
                "date": entry_title,
                "timestamp": updated_date,
                "type": item["type"],
                "content_html": item["content_html"],
                "plain_text": plain_desc
            })
            
    return all_updates

def fetch_and_cache_feed(force=False):
    """Fetch feed, parse it, and cache the result."""
    now = datetime.now()
    
    # Return cache if available and not forced
    if not force and FEED_CACHE["data"] is not None:
        # Check if cache is older than 5 minutes
        time_diff = now - FEED_CACHE["last_fetched"]
        if time_diff.total_seconds() < 300:
            return FEED_CACHE["data"], False

    try:
        response = requests.get(FEED_URL, timeout=15)
        response.raise_for_status()
        
        # Parse XML
        releases = parse_xml_feed(response.content)
        
        # Update cache
        FEED_CACHE["data"] = releases
        FEED_CACHE["last_fetched"] = now
        return releases, True
    except Exception as e:
        print(f"Error fetching feed: {e}")
        # If fetch fails but we have cached data, return cached data
        if FEED_CACHE["data"] is not None:
            return FEED_CACHE["data"], False
        raise e

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/releases")
def get_releases():
    force_refresh = request.args.get("refresh", "false").lower() == "true"
    try:
        releases, was_fetched = fetch_and_cache_feed(force=force_refresh)
        return jsonify({
            "success": True,
            "releases": releases,
            "cached": not was_fetched,
            "last_fetched": FEED_CACHE["last_fetched"].isoformat() if FEED_CACHE["last_fetched"] else None
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

if __name__ == "__main__":
    # Run locally on port 5000
    app.run(host="127.0.0.1", port=5000, debug=True)
