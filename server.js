const express = require('express');
const bodyParser = require('body-parser');
const passport = require('passport');
const authJwtController = require('./auth_jwt'); // You're not using authController, consider removing it
const jwt = require('jsonwebtoken');
const cors = require('cors');
const User = require('./Users');
const Movie = require('./Movies'); // You're not using Movie, consider removing it
require('dotenv').config();


const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(passport.initialize());

const router = express.Router();

// Removed getJSONObjectForMovieRequirement as it's not used

router.post('/signup', async (req, res) => { // Use async/await
  if (!req.body.username || !req.body.password) {
    return res.status(400).json({ success: false, msg: 'Please include both username and password to signup.' }); // 400 Bad Request
  }

  try {
    const user = new User({ // Create user directly with the data
      name: req.body.name,
      username: req.body.username,
      password: req.body.password,
    });

    await user.save(); // Use await with user.save()

    res.status(201).json({ success: true, msg: 'Successfully created new user.' }); // 201 Created
  } catch (err) {
    if (err.code === 11000) { // Strict equality check (===)
      return res.status(409).json({ success: false, message: 'A user with that username already exists.' }); // 409 Conflict
    } else {
      console.error(err); // Log the error for debugging
      return res.status(500).json({ success: false, message: 'Something went wrong. Please try again later.' }); // 500 Internal Server Error
    }
  }
});


router.post('/signin', async (req, res) => { // Use async/await
  try {
    const user = await User.findOne({ username: req.body.username }).select('name username password');

    if (!user) {
      return res.status(401).json({ success: false, msg: 'Authentication failed. User not found.' }); // 401 Unauthorized
    }

    const isMatch = await user.comparePassword(req.body.password); // Use await

    if (isMatch) {
      const userToken = { id: user._id, username: user.username }; // Use user._id (standard Mongoose)
      const token = jwt.sign(userToken, process.env.SECRET_KEY, { expiresIn: '1h' }); // Add expiry to the token (e.g., 1 hour)
      res.json({ success: true, token: 'JWT ' + token });
    } else {
      res.status(401).json({ success: false, msg: 'Authentication failed. Incorrect password.' }); // 401 Unauthorized
    }
  } catch (err) {
    console.error(err); // Log the error
    res.status(500).json({ success: false, message: 'Something went wrong. Please try again later.' }); // 500 Internal Server Error
  }
});

/*router.route('/movies')
    .get(authJwtController.isAuthenticated, async (req, res) => {
        return res.status(500).json({ success: false, message: 'GET request not supported' });
    })
    .post(authJwtController.isAuthenticated, async (req, res) => {
        return res.status(500).json({ success: false, message: 'POST request not supported' });
    }); */

    router.route('/movies')
    .get(authJwtController.isAuthenticated, async (req, res) => {
      try {
          if (Object.keys(req.query).length === 0) {
              const movies = await Movie.find();
              return res.status(200).json(movies);
          } else {
              const movies = await Movie.find(req.query);
              if (movies.length === 0) {
                  return res.status(404).json({ message: 'No matching movies found' });
              }
              return res.status(200).json(movies);
          }
      } catch (error) {
          return res.status(500).json({ message: 'Internal Server Error', error });
      }
  })
  .post(authJwtController.isAuthenticated, async (req, res) => {
    try {
        if (Object.keys(req.query).length > 0) {
            return res.status(400).json({ message: 'Query parameters are not allowed in POST request' });
        }

        const { title, releaseDate, genre, actors } = req.body;

        if (!title || !releaseDate || !genre || !actors || actors.length < 3) {
            return res.status(400).json({ message: 'Title, release date, genre, and at least 3 actors are required' });
        }

        const newMovie = new Movie({
            title,
            releaseDate,
            genre,
            actors
        });

        await newMovie.save();
        return res.status(201).json({ message: 'Movie saved successfully', movie: newMovie });
    } catch (error) {
        return res.status(500).json({ message: 'Internal Server Error', error });
    }
})
.put(authJwtController.isAuthenticated, async (req, res) => {
    try {
        if (!req.query.title) {
            return res.status(400).json({ message: "Query string (title) is required for updating a movie." });
        }
        const { title } = req.query;
        const updateData = req.body;
        const updatedMovie = await Movie.findOneAndUpdate(
            { title },
            updateData,
            { new: true } 
        );
        if (!updatedMovie) {
            return res.status(404).json({ message: "Movie not found." });
        }
        res.status(200).json({ message: "Movie updated successfully.", movie: updatedMovie });
    } catch (error) {
        res.status(500).json({ message: "Internal Server Error", error });
    }
})
.delete(authJwtController.isAuthenticated, async (req, res) => {
    try {
        if (!req.query.title) {
            return res.status(400).json({ message: "Query string (title) is required for deleting a movie." });
        }
        const { title } = req.query;
        const deletedMovie = await Movie.findOneAndDelete({ title });
        if (!deletedMovie) {
            return res.status(404).json({ message: "Movie not found." });
        }
        res.status(200).json({ message: "Movie deleted successfully." });
    } catch (error) {
        res.status(500).json({ message: "Internal Server Error", error });
    }
});


app.use('/', router);

const PORT = process.env.PORT || 8080; // Define PORT before using it
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

module.exports = app; // for testing only