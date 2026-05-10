require('dotenv').config({ path: require('path').join(__dirname, '../.env') })
const { google } = require('googleapis')

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/drive.readonly'],
})

const drive = google.drive({ version: 'v3', auth })

async function main() {
  const res = await drive.files.list({
    q: `'${process.env.DRIVE_FOLDER_ID}' in parents and trashed = false`,
    fields: 'files(id, name, mimeType)',
    orderBy: 'name',
  })

  const files = res.data.files
  if (!files.length) {
    console.log('Nenhum arquivo encontrado na pasta.')
    return
  }

  console.log('Arquivos na pasta do Drive:\n')
  files.forEach(f => {
    console.log(`Nome: ${f.name}`)
    console.log(`URL:  https://drive.google.com/uc?id=${f.id}`)
    console.log()
  })
}

main().catch(err => {
  console.error('Erro:', err.message)
  process.exit(1)
})
