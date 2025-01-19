# OpenQuill

todo: make readme :)

This is gonna be a simple yet versatile self-hosted blog platform for anyone to whip up an instance of easily on their server and have many users if they decide to do so :)


Things to implement eventually:
- hiding blogs
- custom blog sitewide configs
- user customizable blog color schemes
- light mode maybe
- optimize by adding admin, frozen, and other user variables to jwt token to minimize DB queries
- also optimize with nuxt caching features & pinia (I gotta learn those)
- add blog pagination (not hard but like I really wanna work on other projects so I'll do it later lol)
- make the blog URL slug customizable as opposed to it just being the blog title (optimizing potentially bloated URLs)
- modularize page code a lot more with things such as pages component, posts component, etc.
- Add newsletter list capability (whoever hosts it can add an SMTP server and it'll send emails to recipients who subscribe to updates from blog)
- Add code highlighting in post content
- organize the code a lot more bc rn it's super messy lol (modularize the frontend better with more components)
- make frontend link with DB somehow so that if there are 2 tabs for example working on the same post, all data updates live accross all instances/sessions of that user
- update the frontend "// changes DB" comments bc I forgot half the time lol
- Fix the mediocre docker setup
- copy paste support for images in post editor


# OpenQuill

OpenQuill is a modern, self-hosted blogging platform built for developers and writers. It allows multiple users to create and manage their own blogs with a clean, minimalist interface.

## ✨ Features

- **Multi-User Support**: Host multiple blogs on a single instance
- **Markdown Editor**: Write posts in Markdown with live preview
- **Image Management**: Drag & drop image uploads with alt text support
- **Customization**: Each blog can have its own description, tags, and hero image
- **Draft System**: Save posts as drafts before publishing
- **User Profiles**: Customizable user profiles with avatar and website links
- **Responsive Design**: Clean, modern UI that works on all devices
- **Admin Controls**: Manage users and content with admin features
- **Auto-Save**: Never lose your work with automatic draft saving

## 📦 Installation & Hosting

### Using Docker (Recommended for Hosting)

1. Clone the repository:
```bash
git clone https://github.com/ZachLTech/OpenQuill.git
```

2. Copy the example env file:
```bash
cp .env.example .env
```

3. Configure your .env file with your settings:
```
AUTH_SECRET=your_secret
PORT=3000
DATABASE_URL=postgresql://...
# See .env.example for all options
```

4. Build and run with Docker:

```bash
docker-compose up -d
```

### Manual Installation (For Development)

1. Clone and install dependencies:

```bash
git clone https://github.com/ZachLTech/OpenQuill.git
cd OpenQuill/app
npm install
```

2. Set up your environment variables (see .env.example)

3. Initialize the database:

```bash
npx prisma db push
npx prisma generate
```

4. Run the development server:

```bash
npm run dev
```

## Configuration