# Roadmap
- [x] Correct Form 1 and Form 6 PDF text and digit alignment; locally downloaded both actual templates with test data and visually verified boxed digits, labels, logos and two-page output against preview (tests passed; build OK).
- [ ] Recheck insurance PDF downloads in the signed-in app — blocked by Cloud connection pooler unavailable and failed session restoration.
- [x] Add direct PDF downloads for every employee form in Documents and employee profiles, named after the form and employee; verified all nine downloads and multipage PDFs in the signed-in preview (2 tests passed; build OK).
- [x] Ensure employee marriage leave persists as marriage, never falls back to annual, and verify persistence regression tests (26 tests passed; build OK).
- [x] Enforce marriage leave maximum excluding Fridays across creation/editing and database, show employee notice, and verify tests (26 passed).
- [ ] Verify marriage leave submission/readback in the live employee portal — blocked until the user signs in; no managed auth account matches the requesting user.

- [x] Normalize requested Arabic job titles and spelling in primary and saved business records, then verify no variants remain.

- [x] Replace the mutual termination template with a dynamic two-page A4 version using the uploaded Ministry of Labour logo.
- [x] Add a dynamic A4 final settlement tab based on the uploaded document.
- [x] Add a multi-select Employment Status filter to the Training Qualification Record report, with bilingual labels and tests (4 passed; build OK).
