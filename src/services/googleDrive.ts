/**
 * Client-side Google Drive operations.
 * Uses the user's OAuth access token (stored in localStorage).
 */

const SERVICE_ACCOUNT = 'aiesec-shop-sheets@aiesec-shop.iam.gserviceaccount.com'

function getAccessToken(): string | null {
  return localStorage.getItem('oauth_token')
}

/**
 * Creates a per-conference spreadsheet in the user's Drive,
 * shares it with the service account, and returns the spreadsheetId.
 */
export async function createConferenceSpreadsheet(
  conferenceName: string
): Promise<string> {
  const token = getAccessToken()
  if (!token) throw new Error('Não autenticado. Faça login novamente.')

  const authH = { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }

  // 1. Create spreadsheet
  const create = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: authH,
    body: JSON.stringify({
      properties: { title: 'OC-Shop - ' + conferenceName },
      sheets: [
        { properties: { title: 'Products' } },
        { properties: { title: 'Orders' } },
      ],
    }),
  })

  if (!create.ok) {
    const err = await create.text()
    throw new Error('Falha ao criar planilha: ' + create.status + ' ' + err)
  }

  const { spreadsheetId } = await create.json()

  // 2. Write headers
  const H = {
    Products: ['id','conferenceId','name','description','price','stock','image','imageUrl','active','variants'],
    Orders: ['id','conferenceId','conferenceSlug','userId','userName','buyerName','buyerEmail','buyerPhone','items','total','status','createdAt'],
  }

  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Products!A1:J1?valueInputOption=RAW`,
    { method: 'PUT', headers: authH, body: JSON.stringify({ values: [H.Products] }) }
  )
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Orders!A1:M1?valueInputOption=RAW`,
    { method: 'PUT', headers: authH, body: JSON.stringify({ values: [H.Orders] }) }
  )

  // 3. Share with service account
  await fetch(`https://www.googleapis.com/drive/v3/files/${spreadsheetId}/permissions`, {
    method: 'POST',
    headers: authH,
    body: JSON.stringify({
      role: 'writer',
      type: 'user',
      emailAddress: SERVICE_ACCOUNT,
    }),
  })

  return spreadsheetId
}
