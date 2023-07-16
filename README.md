# FamilyShips

A web application for creating and visualizing family trees.

## How to host?

### Secrets

First, create a file called `/src/main/resources/secret.properties`, with the following contents:

```
DB_USER=<MySQL user name>
DB_PASS=<MySQL password>
GIT_CLIENT_ID=<from https://github.com/settings/developers>
GIT_SECRET=<generated from https://github.com/settings/developers>
GOOGLE_CLIENT_ID=<Google client id>
GOOGLE_SECRET=<Google secret>
```

How to get all those values is described below.

### MySql

#### Hosting locally

You need to download MySQL and run it locally. 

#### Hosted externally

You can use an external instance of MySQL by adding a line `MYSQL_HOST=<host>` to `secret.properties`.

#### Requirements

You need to setup a database called `FamilyShips` within the chosen MySQL instance. You also need one user that will be able to interact with that database. Put the credentials of this user in `DB_USER` and `DB_PASS`.

### Git

You need to go to https://github.com/settings/developers and setup an application. You then need to get the `GIT_CLIENT_ID` and `GIT_SECRET`.

### Google

Follow the guide on "Setting up OAuth 2.0" on https://developers.google.com/identity/openid-connect/openid-connect to get the `GOOGLE_CLIENT_ID` and `GOOGLE_SECRET`.
