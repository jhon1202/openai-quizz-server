const express = require('express');
require("dotenv").config();
const axios = require('axios');
const bp = require("body-parser");
const fileUpload = require("express-fileupload");
const pdfParse = require('pdf-parse');
const { google } = require('googleapis');

const app = express();
const cors = require('cors');

app.use("/", express.static("public"));
app.use(fileUpload());
app.use(cors());
app.use(bp.json());
app.use(bp.urlencoded({ extended: true }));

// Set up Google API credentials
var google_api_key = process.env.GOOGLE_API_KEY;
// OpenAI API endpoint
const openAiEndpoint = 'https://api.openai.com/v1/engines/gpt-3.5-turbo/completions';
// OpenAI API key
const openAiApiKey = process.env.OPENAI_API_KEY;

// const youtube = google.youtube({
//     version: 'v3',
//     auth: google_api_key
//   });
  
// async function getVideoTranscriptFromYouTubeLink(youtubeLink) {
//     try {
//         // Extract video ID from the YouTube link
//         const videoId = youtubeLink.split('v=')[1];

//         // Retrieve caption information for the video
//         const captionsResponse = await youtube.captions.list({
//         part: 'snippet',
//         videoId: videoId
//         });

//         // Get the caption track ID
//         const captionTrackId = captionsResponse.data.items[0].id;

//         // Retrieve the full transcript text using the caption track ID
//         const transcriptResponse = await youtube.captions.download({
//         id: captionTrackId,
//         tfmt: 'ttml' // You may need to adjust the format based on your requirements
//         });

//         const transcriptText = transcriptResponse.data;

//         return transcriptText;
//     } catch (error) {
//         console.error('Error fetching video transcript:', error);
//         return '';
//     }
// }


// Function to fetch video details from YouTube Data API
async function fetchVideoDetails(videoId, apiKey) {
    try {
      var url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${apiKey}`;
      
      var response = await axios.get(url);
      var videoData = response.data;
  
      if (videoData.items.length > 0) {
        var videoDetails = videoData.items[0].snippet;
        return videoDetails;
      } else {
        throw new Error('Video not found');
      }
    } catch (error) {
      throw new Error('Error fetching video details: ' + error.message);
    }
  }
  
  // Function to extract video ID from YouTube video link
  function extractVideoId(videoLink) {
    var regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    var match = videoLink.match(regExp);
    if (match && match[2].length == 11) {
      return match[2];
    }
    return null;
  }
  
  // Function to generate summary from video details
  function generateSummary(videoDetails) {
    const title = videoDetails.title;
    const description = videoDetails.description;
    const summary = `Title: ${title}\n\nDescription: ${description}`;
    return summary;
  }

async function generateQuiz(promptconent) {
  
  const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
          'model': 'gpt-3.5-turbo',
          'messages': [
              { 
                  role: "system", 
                  content: "Please generate 20 quizes surely. {'quizList':[{'question':'question', options:['answer1','answer2','answer3','answer4'],'correct_answer':'answer'}]}. The result type should be exactly same with json object type without order number string."
              },
              {
                  role: "user", 
                  content: promptconent
              }
          ]
      },
      {
        headers: {
          'Authorization': `Bearer ${openAiApiKey}`
        }
      }
  );
  return response.data.choices[0]['message']['content'];
}

async function generateNotes(promptconent) {
  
  const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
          'model': 'gpt-3.5-turbo',
          'messages': [
              { 
                  role: "system", 
                  content: "Generate notes from the text."
              },
              {
                  role: "user", 
                  content: promptconent
              }
          ]
      },
      {
        headers: {
          'Authorization': `Bearer ${openAiApiKey}`
        }
      }
  );
  return response.data.choices[0]['message']['content'];
}

app.get('/', (req, res) => {
    res.send('Hello from our server!')
})

app.post("/parsefile", (req, res) => {
  if (!req.files && !req.files.quizfile) {
      res.status(400);
      res.end();
  }

  pdfParse(req.files.quizfile).then(result => {
    var text = result.text.replace(/\n/gi, " ");
    text = text.slice(0, 4096);
      generateQuiz(text).then(quiz => {
        res.send(quiz);
      }).catch((error1) => {
        console.error(error1);
        res.send(error1);
      })
  });
});

app.post("/filenotes", (req, res) => {
  if (!req.files && !req.files.quizfile) {
      res.status(400);
      res.end();
  }

  pdfParse(req.files.quizfile).then(result => {
    var text = result.text.replace(/\n/gi, " ");
    text = text.slice(0, 4096);
    // res.send(text);
    generateNotes(text).then(notes => {
      res.send(notes);
    }).catch((error1) => {
      console.error(error1);
      res.send(error1);
    })
  });
});

app.post('/video', (req, res) => {
  // Fetch video details and generate summary
  const youtubeVideoLink = req.body.videolink;
  var videoId = extractVideoId(youtubeVideoLink);
  fetchVideoDetails(videoId, google_api_key)
  .then((videoDetails) => {
      var summary = generateSummary(videoDetails);
      summary = summary.replace(/\n/gi, "");
      generateQuiz(summary).then(quiz => {
          res.send(quiz);
      }).catch((error1) => {
          console.error(error1);
          res.send(error1);
      })
  })
  .catch((error) => {
      console.error(error);
      res.send(error);
  });

  // getVideoTranscriptFromYouTubeLink(youtubeVideoLink)
  // .then(transcriptText => {
  //     console.log(transcriptText);
  //     res.send(transcriptText);
  // })
  // .catch(error => {
  //     console.error(error);
  // });
})

app.post('/videonotes', (req, res) => {
  // Fetch video details and generate summary
  const youtubeVideoLink = req.body.videolink;
  var videoId = extractVideoId(youtubeVideoLink);
  fetchVideoDetails(videoId, google_api_key)
  .then((videoDetails) => {
      var summary = generateSummary(videoDetails);
      summary = summary.replace(/\n/gi, "");
      // res.send(summary);
      generateNotes(summary).then(notes => {
          res.send(notes);
      }).catch((error1) => {
          console.error(error1);
          res.send(error1);
      })
  })
  .catch((error) => {
      console.error(error);
      res.send(error);
  });

  // getVideoTranscriptFromYouTubeLink(youtubeVideoLink)
  // .then(transcriptText => {
  //     console.log(transcriptText);
  //     res.send(transcriptText);
  // })
  // .catch(error => {
  //     console.error(error);
  // });
})

app.listen(8080, () => {
      console.log('server listening on port 8080')
})

// Export the Express API
module.exports = app;