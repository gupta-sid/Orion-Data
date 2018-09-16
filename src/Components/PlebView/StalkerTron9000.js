import React, { Component } from 'react';
import { Grid, Typography } from "@material-ui/core"
import Button from '@material-ui/core/Button';
import Clarifai from 'clarifai'
import firebase from './Firebase.js'
import axios from 'axios'
import {storeAge, storeRace} from '../../ReduxActions/dataActions';
import {bindActionCreators} from 'redux';
import { connect } from 'react-redux';
import compose from 'recompose/compose';
import { withStyles } from "@material-ui/core/styles";

const borderStyles = {
  borderColor: '#e8e8e8',
  borderWidth: 1,
  borderRadius: 0,
  borderStyle: 'solid',
  backgroundColor: 'white'

};

class TestStream extends Component {

  constructor(){
    super();
    this.state={
      videoURL: null,
      videoObj: null,
      imageURL: null,
      streaming: false,
      canvasSet: false,
      clicked: false
    }
    this.videoRef = React.createRef();
    this.canvasContext = React.createRef();
    this.canvasRef = React.createRef();
    this.interval = null;
  }

  handleClick = () => {
    if(!this.state.clicked){
      navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        .then((stream) => {
          this.setState({videoObj: stream, videoURL : URL.createObjectURL(stream)});
          this.videoRef.current.play();
        })
        .catch((err) => {
            console.log("An error occurred! " + err);
        });
      this.interval = setInterval(this.takePicture, 3000);
      this.setState({clicked: true});
    }else{
      this.state.videoObj.getTracks()[0].stop();
      this.setState({videoObj: null, videoURL : null, clicked: false});
      clearInterval(this.interval);
    }
  }

  takePicture = () => {
    var canvas = this.state.canvas;
    var context = this.state.context;
    context.drawImage(this.videoRef.current, 0, 0, canvas.width, canvas.height);
    this.setState({imageURL: canvas.toDataURL()});
    // Create HTTP URL for the image
    canvas.toBlob((blob) => {
      var storageRef = firebase.storage().ref();
      // Actually upload the image online to firebase
      var path = 'images/' + "IMG_" + blob.size;
      var uploadTask = storageRef.child(path).put(blob).then(
        (snapshot) => {
          snapshot.ref.getDownloadURL().then((downloadURL) => {
            this.setState({downloadURL: downloadURL}, () => {

              console.log("the try");
              console.log(processImage(this.state.downloadURL));

              // Send API call!
              const app = new Clarifai.App({
               apiKey: '8bcf85e82e1949a18d130c8fe108df16'
              });

              app.models.predict("c0c0ac362b03416da06ab3fa36fb58e3", this.state.downloadURL).then(
                  (response) => {
                    console.log(response);
                    var age = response.outputs[0].data.regions[0].data.face.age_appearance.concepts[0].name;
                    var race = response.outputs[0].data.regions[0].data.face.multicultural_appearance.concepts[0].name;
                    console.log(age + " " + race);
                    this.props.storeAge(age);
                    this.props.storeRace(race);
                  },
                  (err) => {
                    // there was an error
                    console.log(err);
                });
             });
          });
        }
      );
    });
  }



  render() {
    return (
      <Grid container xs={12} sm={12} md={12} lg={12} xl={12}>
        <Grid item xs={6} sm={6} md={6} lg={6} xl={6} >
          <video id="video" ref={this.videoRef} src={this.state.videoURL} style={{display:"none"}}/>
        </Grid>
        <Grid item xs={6} sm={6} md={6} lg={6} xl={6}>
        </Grid>
        <Grid item xs={12} sm={12} md={12} lg={12} xl={12} style={{textAlign: "center"}}>
          <Button onClick={this.handleClick}>Begin!</Button>
        </Grid>
        <Grid item xs={6} sm={6} md={6} lg={6} xl={6} style={{textAlign: "center"}}>
          <canvas display={"none"} style={{height: 480, width: 640, display: "none"}} display={false} ref={(c) => {
            if(c != null && !this.state.canvasSet){
              this.setState({context: c.getContext('2d'), canvas: c, canvasSet: true}, () => {
                console.log("Context set!");
              });
            }
          }} id="canvas">
          </canvas>
        </Grid>
      </Grid>
    );
  }
}

function processImage(url) {
    // Replace <Subscription Key> with your valid subscription key.
    var subscriptionKey = "b102bdaac77944bfa86026cb6295c6b8";

    // NOTE: You must use the same region in your REST call as you used to
    // obtain your subscription keys. For example, if you obtained your
    // subscription keys from westus, replace "westcentralus" in the URL
    // below with "westus".
    //
    // Free trial subscription keys are generated in the westcentralus region.
    // If you use a free trial subscription key, you shouldn't need to change
    // this region.
    var uriBase = "https://westcentralus.api.cognitive.microsoft.com/face/v1.0/detect";

    // Request parameters.
    var params = {
        "returnFaceId": "true",
        "returnFaceLandmarks": "false",
        "returnFaceAttributes":
            "age,gender,headPose,smile,facialHair,glasses,emotion," +
            "hair,makeup,occlusion,accessories,blur,exposure,noise",
        "data": '{"url": ' + '"' + url + '"}'
    };

    // Display the image.
    var sourceImageUrl = url;

    // Perform the REST API call.
    axios.post(
        "https://westcentralus.api.cognitive.microsoft.com/face/v1.0/detect?returnFaceId=true&returnFaceLandmarks=false&returnFaceAttributes=age,gender,headPose,smile,facialHair,glasses,emotion,hair,makeup,occlusion,accessories,blur,exposure,noise",
        '{"url": ' + '"' + url + '"}',
        {
        headers: {
            'Content-Type': 'application/json',
            'Ocp-Apim-Subscription-Key' : subscriptionKey
        },
        }
    )
    .then((response) => {
        // Show formatted JSON on webpage.
        console.log(response);
        return response;
    })
    .catch((error) => {
        console.log(error)
      // alert(error);
      return null;
    });
};

function matchDispatchToProps(dispatch){
  return bindActionCreators({storeAge: storeAge, storeRace: storeRace},
                            dispatch);
}

export default connect(null, matchDispatchToProps)(TestStream);
