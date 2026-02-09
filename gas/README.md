# GAS Web API setup

## 1) Create a spreadsheet
- Create a new Google Spreadsheet and name it (any name is fine).
- Open Extensions -> Apps Script.

## 2) Add the script
- Create a file named `Code.gs` and paste the contents from this repo's `gas/Code.gs`.

## 3) Deploy as Web App
- Deploy -> New deployment -> Web app.
- Execute as: Me.
- Who has access: Anyone.
- Copy the Web App URL.

## 4) Configure the frontend
- Open `app.js` and replace `YOUR_GAS_WEB_APP_URL` with the Web App URL.

## 5) Test
- Open the GitHub Pages URL and submit a record.
- Confirm a row appears in the `records` sheet.
