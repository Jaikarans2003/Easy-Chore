# Easy Chore - Home Management Application

A web application for managing household chores, expenses, and members across multiple homes.

## Features

- **User Authentication**: Secure login and signup with email/password or Google authentication
- **Multiple Homes**: Create and join different homes with unique access codes
- **Member Management**: Add and manage members for each home
- **Chore Tracking**: Create, assign, and mark chores as complete with photo verification
- **Home Selection**: Select between multiple homes you belong to
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Node.js, Express.js
- **Database**: MongoDB
- **Authentication**: Firebase Authentication
- **File Storage**: Firebase Storage

## Prerequisites

Before you begin, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (v14.0.0 or higher)
- [npm](https://www.npmjs.com/) (v6.0.0 or higher)
- [MongoDB](https://www.mongodb.com/try/download/community) (local or Atlas cloud database)
- [Git](https://git-scm.com/downloads) (for version control)

## Installation

1. **Clone the repository**

```bash
git clone https://github.com/yourusername/easy-chore.git
cd easy-chore
```

2. **Install dependencies**

```bash
npm install
```

3. **Set up environment variables**

Create a `.env` file in the root directory with the following variables:

```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/easy-chore
NODE_ENV=development
```

For MongoDB Atlas, use the connection string from your Atlas dashboard:

```
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/easy-chore
```

4. **Set up Firebase**

- Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
- Enable Authentication (Email/Password and Google providers)
- Create a Web App and copy the Firebase config
- Update the `firebaseConfig` object in `public/js/auth.js` with your credentials

5. **Run the application**

```bash
npm start
```

The application will be available at `http://localhost:3000`.

## Development

For development with hot reloading:

```bash
npm run dev
```

## Folder Structure

```
├── models/              # MongoDB models
├── public/              # Static files
│   ├── css/             # Stylesheets
│   ├── js/              # Client-side JavaScript
│   ├── img/             # Images
│   └── *.html           # HTML pages
├── routes/              # API routes
├── server.js            # Express server
├── middleware/          # Custom middleware
├── package.json         # Dependencies
└── README.md            # This file
```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login a user

### Homes

- `GET /api/homes/user/homes` - Get all homes for a user
- `POST /api/homes` - Create a new home
- `POST /api/homes/join` - Join an existing home
- `GET /api/homes/:homeId` - Get home details
- `GET /api/homes/:homeId/members` - Get home members
- `POST /api/homes/add-member` - Add a member to a home

### Chores

- `GET /api/chores/:homeId` - Get all chores for a home
- `POST /api/chores/add` - Add a new chore
- `PUT /api/chores/:choreId` - Update a chore
- `DELETE /api/chores/:choreId` - Delete a chore
- `POST /api/chores/:choreId/complete` - Mark a chore as complete

## Version Control

The project uses Git for version control. To work with versions:

1. **Create a new branch for features**

```bash
git checkout -b feature/my-new-feature
```

2. **Commit changes**

```bash
git add .
git commit -m "Add my new feature"
```

3. **Push to remote repository**

```bash
git push origin feature/my-new-feature
```

4. **Create a pull request** on GitHub to merge changes

5. **To revert to a previous version**

```bash
git log --oneline  # Find the commit hash
git checkout <commit-hash>  # Go to that version
```

## Troubleshooting

### MongoDB Connection Issues

- Ensure MongoDB is running locally or your Atlas credentials are correct
- Check that the connection string in `.env` is properly formatted

### Firebase Authentication Issues

- Verify Firebase config in `public/js/auth.js`
- Ensure Authentication providers are enabled in Firebase Console

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contact

For any questions or issues, please open an issue on the GitHub repository. 