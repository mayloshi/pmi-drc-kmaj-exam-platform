# Google Sheets backend

Use `Code.gs` in a Google Apps Script project bound to the Google account that owns the Drive folder.

1. Create or open a Google Apps Script project.
2. Paste `Code.gs`.
3. Run `setupDatabase()` once and authorize Drive, Sheets, and Mail.
4. Deploy as a Web App.
5. Copy the Web App URL into the trainer dashboard field `Endpoint Apps Script`.

After every change to `Code.gs`, create a new Apps Script deployment version or edit the existing Web App deployment so GitHub Pages calls the latest code.

The script creates or reuses:

- Folder: `PMP Prep/DATABASE`
- Spreadsheet: `PMI RDC K-Majuscule Exam Platform Database`
- Sheets: `Candidates`, `TrainerAccounts`, `UserAccounts`, `Vouchers`, `QuestionBank`, `Lots`, `Attempts`, `AttemptAnswers`, `SummaryReports`, `EmailQueue`

Supported Web App writes:

- `saveAttempt`
- `saveVouchers`
- `saveUserAccount`
- `sendResultEmail`

Supported Web App reads:

- `vouchers`
- `userAccounts`
- `attempts`
- `lots`
- `questions`

The public GitHub Pages app reads through JSONP (`callback=...`) to avoid browser CORS blocks on Apps Script.

For GitHub Pages, the public site will call the Web App URL for reads and writes.
