# Aloro

A mobile app (iOS and Android, built with Expo) for learning German, English, French, Arabic, and Italian by speaking. Learners pick their own language and one to learn, then work through an A1 course, play a short word game, practice with an AI tutor, and join a voice call with someone at the same level.

- **App:** Expo + TypeScript + Expo Router, in `src/`.
- **API:** plain PHP 8.1+ in `api/`, designed for Hostinger shared hosting.
- **Database:** MySQL/MariaDB (your Hostinger database), schema in `api/schema.sql`.
- **AI:** Gemini for speech-to-text, tutor replies, and the tutor voice, called only from the PHP API, so the key never ships in the app. Free plans use the free models. Paid plans use the paid models.

```
src/app/            Screens (sign-in, onboarding, tabs, lesson player)
src/content/        A1 course per language (de, en, fr, ar, it) + types
src/lib/            API client, session, course helpers, audio, i18n
api/index.php       API router
api/lib/            Auth, learner profile/progress, Gemini tutor
api/schema.sql      MySQL tables
scripts/            Content checks
```

## 1. Deploy the API on Hostinger

1. **Create the database.** In hPanel, go to *Databases → MySQL Databases*, create a database and user, and note the name, user, and password (they look like `u123456789_languages`).
2. **Create the tables.** Open *phpMyAdmin* for that database, choose *Import*, and upload `api/schema.sql`. If this database was created from an older schema, import `api/migrate.sql` once, then `api/migrate-billing.sql` once. Do not import either migration a second time.
3. **Upload the API.** Upload the whole `api/` folder into `public_html/api` (File Manager or FTP). The `.htaccess` file must come along; it routes requests and blocks access to `config.php` and `lib/`.
4. **Configure it.** In `public_html/api`, copy `config.example.php` to `config.php` and fill in:
   - `db`: host (usually `localhost`), name, user, password.
   - `gemini.api_key`: a key from [Google AI Studio](https://aistudio.google.com/apikey). Turn on billing so paid plans can use the paid models.
   - `play.service_account_json`: a Google Play service account JSON, saved as `api/play-service-account.json`. In Play Console, grant that account access to the app, then create the products `aloro_day` ($0.99, one-time), `aloro_week` ($2.99 weekly), `aloro_month` ($7.99 monthly), and `aloro_year` ($49.99 yearly).
   - `ai_daily_limit`: tutor requests per learner per day. Paid plans allow 40 and are also capped by this.
5. **Use PHP 8.1 or newer** (*Advanced → PHP Configuration*) and make sure SSL is active for the domain. iOS requires HTTPS.
6. **Check it.** Open `https://yourdomain.com/api/health`. You should see `{"ok":true}`.

### API endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/auth/register`, `/auth/login`, `/auth/logout` | Email/password accounts; returns a bearer token |
| GET | `/me` | User, profile, completed lessons |
| PUT | `/profile` | Native language, target language, level |
| POST | `/progress/lessons` | Mark a lesson complete and count today's practice |
| POST | `/tutor` | `check` (was this item said correctly?) or `chat` (role-play turn); accepts an audio upload or typed text |
| POST | `/billing/purchase` | Confirm a Google Play purchase and start the day, week, month, or year plan |
| POST | `/billing/reward` | After a rewarded ad, add 5 speaking checks for a free account (twice a day) |
| POST | `/calls/join` | Queue for a voice call with someone learning the same language at the same level |
| GET | `/calls` | Poll the queue or the live call. Partner voice clips come back as base64 |
| POST | `/calls/clips` | Send one short recording to the person on the call |
| POST | `/calls/leave` | Leave the queue or end the call |

Streaks use the learner's local calendar day sent by the app. Practicing on consecutive days extends the streak, and any gap resets it to 1.

## 2. Run the app

Requires Node.js 20.19.4 or newer (React Native 0.86 warns on older versions).

```sh
npm install
cp .env.example .env        # then set EXPO_PUBLIC_API_URL=https://yourdomain.com/api
npx expo start
```

Scan the QR code with Expo Go on your phone for lessons and speaking. Ads and Google Play payments need a development or Play build (`npx eas-cli@latest build --platform android`); they do not run in Expo Go. Use a real phone for speaking practice, because simulator microphones are unreliable. After you change `.env`, restart `npx expo start`.

For store builds, use EAS: `npx eas-cli@latest build --platform android` (or `ios`).

## Local API development (optional)

With PHP 8.1+ and a local MySQL/MariaDB (for example XAMPP):

```sh
mysql -u root -e "CREATE DATABASE linguatalk CHARACTER SET utf8mb4"
mysql -u root linguatalk < api/schema.sql
cp api/config.example.php api/config.php   # point db at your local database
npm run api                                # serves http://0.0.0.0:8080
```

A phone can't reach `127.0.0.1` on your computer, so set `EXPO_PUBLIC_API_URL=http://<your-computer-LAN-IP>:8080`.

## Course content

Each language has one file: `src/content/<lang>/a1.json`. All five share the same units, lessons, and item ids. Glosses, prompts, and goals are written in every language the course is not teaching. After editing, run:

```sh
npm run validate:content
npm run typecheck
```

## Plans and calls

Free accounts get 3-minute calls, 15 AI speaking checks a day, a full-screen ad after a lesson, and a rewarded ad for 5 extra checks. A day pass is $0.99 for 24 hours (15-minute calls, 40 checks). A weekly plan is $2.99 (15-minute calls, 40 checks a day). Monthly is $7.99 and yearly is $49.99 (30-minute calls, 40 checks a day, no ads). The server turns a plan on only after Google Play confirms the payment.

A call pairs two people who are learning the same language at the same level. They send short voice clips to each other. It is not a live two-way phone call.
