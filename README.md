<p align="center"> 
  <img width="500" src="./OpenQuillLogo.png" /> 
</p>

<p align="center">
  <img src="https://img.shields.io/github/stars/ZachLTech/OpenQuill?style=social" alt="GitHub stars">
  <img src="https://img.shields.io/github/forks/ZachLTech/OpenQuill?style=social" alt="GitHub forks">
  <img src="https://img.shields.io/github/license/ZachLTech/OpenQuill" alt="License">
  <img src="https://img.shields.io/website?url=https%3A%2F%2Fopenquill.zachl.tech&label=Demo%20Site" alt="Demo Status">
  <img src="https://img.shields.io/github/issues/ZachLTech/OpenQuill" alt="GitHub issues">
  <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome">
</p>

# OpenQuill

OpenQuill is a modern, self-hosted blogging platform built for developers and writers. It allows multiple users to create and manage their own blogs with a clean, minimalist interface alongside excellent user experience.

## 📑 Table of Contents
- [Features](#features)
- [Demo](#demo)
- [Gallery](#gallery)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
    - [Docker Install](#docker-install)
    - [Manual Install](#manual-install)
- [Configuration](#configuration)
  - [Environment Variables](#environment-variables)
  - [Database Setup](#database-setup)
- [Development](#development)
  - [Tech Stack](#tech-stack)
  - [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)

## Features

- **Simple Hosting**: Very easy to self host with just a few commands
- **Multi-User Support**: Host multiple blogs on a single instance
- **Markdown Editor**: Write posts in Markdown with live preview
- **Image Management**: Drag & drop image uploads with alt text support
- **Customization**: Each blog can have its own description, tags, and hero image
- **Draft System**: Save posts as drafts before publishing
- **User Profiles**: Customizable user profiles with avatar and website links
- **Responsive Design**: Clean, modern UI that works on all devices
- **Admin Controls**: Manage users and content with admin features
- **Auto-Save**: Never lose your work with automatic draft saving
- **More to come...**

## [Demo](https://openquill.zachl.tech)
There is a demo instance running at [openquill.zachl.tech](https://openquill.zachl.tech) and you may login to the Demo user to view the editor and test everything out with these login credentials:

`Email`: demo@demo.demo

`Password`: Testing123!

You can also view a walkthrough on setting up OpenQuill which includes a tour [here]()

### [Gallery](./gallery/README.md)

View a gallery of screenshots from the demo instance at [`/gallery/README.md`](./gallery/README.md) 

## Installation & Hosting

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

### Updating (Docker instance)

1. Pull updates:

```bash
git pull
```

2. Rebuild and run instance:

```bash
docker-compose up -d --build
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

* `AUTH_SECRET`:  # Secret for Auth security
* `API_ROUTE_SECRET`:  # Secret for API security
* `PORT`: # Port where the actual webapp will be run, This can be anything you want.
* `POSTGRES_PORT`: # Port where your postgres DB will be run, I'd keep this the same if possible.
* `BASE_URL`: # URL where your instance is hosted. (protocol included - e.g. https://openquill.zachl.tech)
* `AUTH_ORIGIN`: # Domain hostname where your instance is hosted. (NOT protocol included - e.g. openquill.zachl.tech)
* `ALLOW_SIGNUPS`: # Boolean - if false, signing up will be disabled on your instance.
* `ENABLE_SINGLE_BLOG_AUTO_REDIRECT`: Boolean - if enabled and there's only a single owner/user/blog present, navigating to the root of the site will redirect to the blog (instead of a list of all blogs) - this is best for personal single blog OpenQuill instances.
* `PLATFORM_TITLE`: String which will appear at the top left of the navbar sitewide.
* `POSTGRES_USER`: DB Admin User, Should keep the same.
* `POSTGRES_PASSWORD`: DB Admin User Password, You could change this for more security.
* `POSTGRES_DB`: DB Name, Should keep the same.
* `DATABASE_URL`: Don't change this if you don't know what you're doing.

## Contributing 

Contributions are welcome! Simply fork and make a PR!

Current development priorities/TODO (in no particular order):

- implement allowing users to hide their blogs
- custom blog sitewide configs (color schemes for blogs, more modularity, etc.)
- light mode maybe
- optimize by adding admin, frozen, and other user variables to jwt token to minimize DB queries
- also optimize with nuxt caching features & pinia
- add blog pagination to optimize home page loading times(not hard but like I really wanna work on other projects so I'll do it later lol)
- make the blog URL slug customizable as opposed to it just being the blog title (optimizing potentially bloated URLs)
- modularize page code a lot more with things such as pages component, posts component, etc.
- Add newsletter list capability (whoever hosts it can add an SMTP server and it'll send emails to recipients who subscribe to updates from blog)
- Add code syntax highlighting in post content render
- organize the code a lot more bc rn it's super messy lol (modularize the frontend better with more components)
- make frontend link with DB somehow so that if there are 2 tabs for example working on the same post, all data updates live accross all instances/sessions of that user
- update the frontend "// changes DB" comments bc I forgot to use them half the time lol
- Fix the mediocre docker setup
- Implement image copy and paste support for post editor

### Issues

Please feel free to create an issue if a bug is found or even if you simply have a feature request :)

## License

OpenQuill is open-source software licensed under the MIT license.
