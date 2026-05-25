const { google } = require('googleapis')

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive.file',
  ],
})

const drive = google.drive({ version: 'v3', auth })
const DRIVE_FOLDER_ID = process.env.DRIVE_FOLDER_ID || null

module.exports = { drive, DRIVE_FOLDER_ID }
