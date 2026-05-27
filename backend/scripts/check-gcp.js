require('dotenv').config({ path: __dirname + '/.env' })

const projectId = 'aiesec-shop'
const oauthClientId = '894335492008-iju4ms2jc186p3kb4v9nh3822l3l87ns.apps.googleusercontent.com'

console.log('=== GCP Configuration Check ===\n')
console.log('Project ID:', projectId)
console.log('OAuth Client ID:', oauthClientId.substring(0, 35) + '...\n')

console.log('📋 MANUAL STEPS (2 min):')
console.log('')
console.log('1. Open: https://console.cloud.google.com/apis/credentials?project=' + projectId)
console.log('2. Click the OAuth 2.0 Client ID')
console.log('3. Under "Authorized JavaScript origins", ADD:')
console.log('   http://localhost:5173')
console.log('   https://oc-shop.pages.dev')
console.log('4. Under "Authorized redirect URIs", ADD:')
console.log('   http://localhost:5173')
console.log('   https://oc-shop.pages.dev')
console.log('5. Click SAVE')
console.log('6. Go to: https://console.cloud.google.com/apis/credentials/consent?project=' + projectId)
console.log('7. Click PUBLISH APP (or add test users)')
console.log('8. Wait 2 minutes for propagation')
