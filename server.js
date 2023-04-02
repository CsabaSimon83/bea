const express = require('express')
const multer = require('multer')
const xlsx = require('xlsx')
const nodemailer = require('nodemailer')
const fs = require('fs')
const path = require('path')
const https = require('https')
const bodyParser = require('body-parser')

const app = express()
const port = 443

// Serve static files from the "dist" folder
app.use(express.static(path.join(__dirname, 'dist')))

app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(bodyParser.json());


const options = {
    key: fs.readFileSync(path.join(__dirname, 'cert','key.pem')),
    cert: fs.readFileSync(path.join(__dirname, 'cert','cert.pem'))
}

// Set up multer for file uploads
const storage = multer.memoryStorage()
const upload = multer({ storage })

// Define a function to check if a file is in Excel format
const isExcelFile = function(file) {
    const fileTypes = [
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]
    return fileTypes.includes(file.mimetype)
}

// Handle file uploads
app.post('/api/upload', upload.single('file'), (req, res) => {
    try {
        let excelFile = null
        if (isExcelFile(req.file)){
            excelFile = req.file
        }

        const workbook = xlsx.read(excelFile.buffer, { type: 'buffer' })
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]
        const rows = xlsx.utils.sheet_to_json(sheet)

        const uniqueIds = Array.from(new Set(rows.map(record => record.id))).map(id => {
            const match = rows.find(item => item.id === id);
            return { id: match.id, email: match.email };
        });
        console.log(uniqueIds)

        // Send out emails using nodemailer
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: req.body.email, // use the provided Gmail account email
                pass: req.body.password // use the provided Gmail account password
            }
        })

        const filePath = path.join(__dirname, 'pdfs', '2023-as tarifák.pdf');

        fs.readFile(filePath, (err, data) => {
            if (err) {
                console.error(err);
                res.status(500).send('Unable to read PDF file');
            } else {
                uniqueIds.forEach(row => {
                    const filteredRecords = rows.filter(record => record.id === row.id);

                    const table = filteredRecords.map(item => {
                        return `<tr>
                            <td style="text-align: center; vertical-align: middle; padding: 8px;">${item.hívószám}</td>
                            <td style="text-align: center; vertical-align: middle; padding: 8px;">${item.ügyfél}</td>
                            <td style="text-align: center; vertical-align: middle; padding: 8px;">${item.tarifa}</td>
                            <td style="text-align: center; vertical-align: middle; padding: 8px;">${item.internetcsomag}</td>
                            <td style="text-align: center; vertical-align: middle; padding: 8px;">${item.havidíj} Ft</td>
                        </tr>`
                    })

                    const HTML = `
                    <p><b>Kedves Ügyfelünk!</b></p>

                    <p>Megérkeztek ÚJ, több szolgáltatást tartalmazó tarifáink!</p>

                    <p>A szolgáltatásunkkal kapcsolatosan fontos információkat küldünk ebben a levélben, kérjük, hogy figyelmesen olvassa végig!</p>

                    <p>Ezúton tájékoztatjuk, hogy a Magyar Telekom Nyrt-vel új, 24 hónapos határozott időre kötött szerződés értelmében a Telemeteor Kft. a jövőben a jelenleginél bővebb szolgáltatást nyújtó tarifákat kínál ügyfeleinek.</p>

                    <p>Ön 2023.03.08-től kezdődő időszaktól veheti igénybe szolgáltatásainkat.</p>

                    <p>Hívószámait a jelenlegi tarifája alapján 2023.03.08-tól kezdődő időszaktól automatikusan az alábbi tarifákba soroljuk át:</p>

                    <table style="border-collapse: collapse;">
                      <thead>
                        <tr>
                          <th style="background-color: blue; color: black; padding: 8px; text-align: center; vertical-align: middle;">Telefonszám</th>
                          <th style="background-color: blue; color: black; padding: 8px; text-align: center; vertical-align: middle;">Ügyfél</th>
                          <th style="background-color: red; color: white; padding: 8px; text-align: center; vertical-align: middle;">Új 2023 tarifa</th>
                          <th style="background-color: red; color: white; padding: 8px; text-align: center; vertical-align: middle;">Új 2023 internet csomag</th>
                          <th style="background-color: red; color: white; padding: 8px; text-align: center; vertical-align: middle;">Havidíj bruttó</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${table}
                      </tbody>
                    </table>
                    <p>A Tarifák a mellékletben találhatóak.

                    <p>A díjaink változása a köztünk érvényben lévő szolgáltatási szerződés külön írásbeli módosítását nem igényli, annak minden rendelkezése változatlanul érvényes és hatályos, kivéve a szerződés hatályára vonatkozó rész, a tarifatáblázat (05 számú melléklet) és a díjtáblázat (01 számú melléklet).</p>

                    <p>A szolgáltatás gyakorlata nem változik.</p>

                    <p>Amennyiben a szerződés fenti módosításával egyetért, tehát azzal, hogy</p>

                    <li style="text-indent: 20px;">a Telemeteor Kft. és Ön közötti szerződés határozott ideje 2025.03.31-ig meghosszabbodik,</li>

                    <p>és hozzájárul azzal, hogy a következő, már az új díjakon kiszámlázott havi számlát kiegyenlíti, az Ön hozzájárulását megadottnak tekintjük.</p>

                    <p>Amennyiben a szerződés módosításához nem kíván hozzájárulást adni, kérjük szíveskedjen jelen levelünk kézhezvételét követő 8 napon belül ennek tényét a Telemeteor Kft. info@telemeteor.hu részére megküldött írásbeli nyilatkozattal közölni, indoklással ellátni.</p>
                    `

                    console.log(HTML)
                    const mailOptions = {
                        from: 'info@telemeteor.hu',
                        to: row.email,
                        subject: `Id: ${row.id}`,
                        html: HTML,
                        attachments: [
                            {
                                filename: '2023-as tarifák.pdf',
                                content: data,
                            },
                        ],
                    }

                    console.log(mailOptions.to)
                    console.log(row.id)

                    transporter.sendMail(mailOptions, (error, info) => {
                        if (error) {
                            console.log(error)
                        } else {
                            console.log(`Email sent to: ${row.email}(${row.id})`)
                        }
                    })
                })


                res.send('Files uploaded and processed successfully')
            }
        })
    } catch (error) {
        console.log(error)
        res.status(500).send('An error occurred while uploading or processing files')
    }
})


// API endpoint to delete uploaded files
app.post('/api/delete', (req, res) => {
    try {
        // Delete the uploaded files from the server
        req.body.files.forEach(file => {
            fs.unlink(file.path, error => {
                if (error) {
                    console.log(error)
                } else {
                    console.log(`File ${file.originalname} deleted from server`)
                }
            })
        })

        res.send('Files deleted successfully')
    } catch (error) {
        console.log(error)
        res.status(500).send('An error occurred while deleting files')
    }
})

const server = https.createServer(options, app)

// Start the server
server.listen(port, () => {
    console.log(`Server running at https://localhost:${port}`)
})
