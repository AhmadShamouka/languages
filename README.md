# LinguaTalk

A mobile app (iOS and Android, built with Expo) for learning German, English, and French by speaking. Learners pick their own language and one to learn, then work through an A1 course and practice with an AI tutor.

- **App:** Expo + TypeScript + Expo Router, in `src/`.
- **API:** plain PHP 8.1+ in `api/`, designed for Hostinger shared hosting.
- **Database:** MySQL/MariaDB (your Hostinger database), schema in `api/schema.sql`.
- **AI:** OpenAI for speech-to-text, tutor replies, and the tutor voice, called only from the PHP API, so the key never ships in the app.

```
src/app/            Screens (sign-in, onboarding, tabs, lesson player)
src/content/        A1 course per language (de, en, fr) + types
src/lib/            API client, session, course helpers, audio, i18n
api/index.php       API router
api/lib/            Auth, learner profile/progress, OpenAI tutor
api/schema.sql      MySQL tables
scripts/            Content checks
```

## 1. Deploy the API on Hostinger

1. **Create the database.** In hPanel, go to *Databases → MySQL Databases*, create a database and user, and note the name, user, and password (they look like `u123456789_languages`).
2. **Create the tables.** Open *phpMyAdmin* for that database, choose *Import*, and upload `api/schema.sql`.
3. **Upload the API.** Upload the whole `api/` folder into `public_html/api` (File Manager or FTP). The `.htaccess` file must come along; it routes requests and blocks access to `config.php` and `lib/`.
4. **Configure it.** In `public_html/api`, copy `config.example.php` to `config.php` and fill in:
   - `db`: host (usually `localhost`), name, user, password.
   - `openai.api_key`: your key from [platform.openai.com](https://platform.openai.com/api-keys).
   - `ai_daily_limit`: tutor requests per learner per day, which caps your OpenAI bill.
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

Streaks use the learner's local calendar day sent by the app. Practicing on consecutive days extends the streak, and any gap resets it to 1.

## 2. Run the app

Requires Node.js 20.19.4 or newer (React Native 0.86 warns on older versions).

```sh
npm install
cp .env.example .env        # then set EXPO_PUBLIC_API_URL=https://yourdomain.com/api
npx expo start
```

Scan the QR code with Expo Go on your phone. Use a real phone for speaking practice, because simulator microphones are unreliable. After you change `.env`, restart `npx expo start`.

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

Each language has one file: `src/content/<lang>/a1.json`. All three share the same units, lessons, and item ids. Glosses, prompts, and goals are written in the two languages a learner of that course might speak. After editing, run:

```sh
npm run validate:content
npm run typecheck
```

## Not built yet

Topic voice rooms, friends, and time-limited voice/video chat between friends. The `profiles` table already stores each learner's languages so those features can build on it.
