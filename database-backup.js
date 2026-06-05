const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis'); // Käytetään pääkirjastoa
require('dotenv').config();

const tempFileName = `backup-${new Date().toISOString().split('T')[0]}.sql`;
const tempFilePath = path.join(__dirname, tempFileName);

async function runBackup() {
  console.log('1. Aloitetaan mysqldump...');

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL puuttuu .env-tiedostosta!');
    process.exit(1);
  }

  try {
    const urlMatches = dbUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
    if (!urlMatches) {
      throw new Error("DATABASE_URL ei ole tuetussa mysql://user:pass@host:port/db muodossa");
    }

    const [, user, password, host, port, database] = urlMatches;

    // JOS Windows ei löydä mysqldumpia, muista laittaa tähän suora polku .exe-tiedostoon,
    // kuten aiemmin teit (esim. "C:\\xampp\\mysql\\bin\\mysqldump.exe")
    const command = `"C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysqldump.exe" -u ${user} -p${password} -h ${host} -P ${port} ${database} > "${tempFilePath}"`;

    exec(command, async (error, stdout, stderr) => {
      if (error) {
        console.error(`mysqldump virhe: ${error.message}`);
        return;
      }

      console.log('2. mysqldump valmis. Ladataan Google Driveen...');
      await uploadToDrive(tempFilePath, tempFileName);
    });

  } catch (err) {
    console.error("Virhe yhteyden parsimisessa:", err.message);
  }
}

async function uploadToDrive(filePath, fileName) {
  try {

    // LISÄÄ NÄMÄ RIVIT TÄHÄN:
  console.log("DEBUG: Onko Client Email olemassa?:", !!process.env.GOOGLE_CLIENT_EMAIL);
  console.log("DEBUG: Onko Private Key olemassa?:", !!process.env.GOOGLE_PRIVATE_KEY);

    // 1. Luodaan JWT-autentikaatioobjekti .env-tiedon pohjalta
process.env.GOOGLE_PRIVATE_KEY


const auth = new google.auth.JWT(
  process.env.GOOGLE_CLIENT_EMAIL,
  null,
  process.env.GOOGLE_PRIVATE_KEY,
  ['https://www.googleapis.com/auth/drive.file']
);

const tokens = await auth.authorize();
console.log("ACCESS TOKEN OK:", !!tokens.access_token);

    // 2. Alustetaan Drive-asiakas ja sidotaan auth-objekti TÄHÄN suoraan kiinni
    const drive = google.drive({ 
      
      version: 'v3', 
      auth: auth // Tämä varmistaa, että jokainen kutsu on automatisoidusti kirjaantunut sisään
    });

    console.log('Yhdistetään Googleen ja ladataan tiedostoa...');

    // 3. Tehdään itse lataus
    const response = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [process.env.GOOGLE_DRIVE_FOLDER_ID],
      },
      media: {
        mimeType: 'application/sql',
        body: fs.createReadStream(filePath),
      },
    });

    console.log(`3. Ladattu onnistuneesti Driveen! Tiedosto ID: ${response.data.id}`);

  } catch (uploadError) {
    console.error('Virhe Drive-latauksessa:', uploadError);
  } finally {
    console.log('4. Poistetaan väliaikainen paikallinen tiedosto...');
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log('Paikallinen tiedosto poistettu. Valmis!');
    }
  }
}

runBackup();