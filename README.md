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


TODO: 
- Add basic SEO (maybe variable SEO based on like post and such that'd be cool)
- Try building (until successful)
- Add docker-compose and dockerfile(s) for both webapp and postgres database
- Make default .env considering postgresdb
- Test everything in new container
- Make Demo instance with silly users and blogs and posts and such
- Make demo instance have frozen demo user with some posts so people can see editing process