'use-strict';

import style from './../css/main.css'
import VideoTrack from './videotrack.js'

function addVideoTrack()
{
    ReactDOM.render(
        <VideoTrack trackUrl="http://babaosoftware.com/bikinginstyle.com/kmlfiles/iBTdg9rbfvc.kml" videoid="iBTdg9rbfvc" title="Central Park Bike Lap"/>,
        $('.video-track-wrapper')[0]);
}


$(document).ready(function()
{
    addVideoTrack();
});
