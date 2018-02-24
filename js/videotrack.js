'use-strict';

import style from './../css/videotrack.css'

import { videoPromise, mapPromise } from './promise.js';

export default class VideoTrack extends React.Component
{
        
    constructor(props)
    {
        super(props);
        this.props.updateMarker = this.props.updateMarker || 500;
        this.props.zoom = this.props.zoom || 15;
        this.timerId = null;
        this.player = null;
        this.timeArray = new Array();
        this.lonArray = new Array();
        this.latArray = new Array();
        this.bikeMarker = null;
        this.googleMap = null;
        this.kmlPromise = $.ajax({
            type: "GET",
            url: this.props.trackUrl,
            dataType: "xml"
        });
    }

    componentDidMount()
    {
        videoPromise.then(this.initPlayer.bind(this));
        Promise.all([this.kmlPromise, mapPromise]).then(this.initTrack.bind(this), this.rejectTrack.bind(this));    
    }

    componentWillUnmount()
    {
    }

    render()
    {
        return (

            <div className="vt-wrapper" ref={(c) => this._wrapperComp = c}>
                <div className="vt-text" >{this.props.title}</div>
                <div className="vt-video" ref={(c) => this._videoComp = c}></div>
                <div className="vt-track" ref={(c) => this._trackComp = c}></div>
            </div>
        );
    }

    initPlayer()
    {
        this.player = new YT.Player(this._videoComp, {
            videoId: this.props.videoid,
            playerVars: {
                rel: 0,
                showinfo: 0,
                modestbranding: 1
            },
            events: {
                "onReady": this.onPlayerReady.bind(this),
                "onStateChange": this.onPlayerStateChange.bind(this)
            }
        });
    
        var videoComp = $(this._wrapperComp).find('.vt-video');
        videoComp.attr('height', '');
        videoComp.attr('width', '');
        //player.setPlaybackQuality('hd720');
    }

    onPlayerReady(event)
    {
    }
    
    onPlayerStateChange(event)
    {
        if (this.player)
        {
            if (event.data == YT.PlayerState.PLAYING)
            {
                if (this.timerId)
                {
                    window.clearInterval(this.timerId);
                    this.timerId = null;
                }
                this.timerId = window.setInterval(function () { this.onPlayerUpdate() }.bind(this), this.props.updateMarker);
            }
            else if (event.data == YT.PlayerState.ENDED || event.data == YT.PlayerState.PAUSED)
            {
                if (this.timerId)
                {
                    window.clearInterval(this.timerId);
                    this.timerId = null;
                }
            }
        }
    }
    
    onPlayerUpdate()
    {
        if (this.player)
        {
            var index = this.findKMLPoint(this.player.getCurrentTime());
            var latlon = new google.maps.LatLng(this.latArray[index], this.lonArray[index]);
            if (!this.bikeMarker)
            {
                this.bikeMarker = new google.maps.Marker({
                    position: latlon,
                    map: this.googleMap,
                    icon: 'http://babaosoftware.com/bikinginstyle.com/images/' + (this.googleMap.getMapTypeId() == google.maps.MapTypeId.SATELLITE ? 'bikeiconyellow.png' : 'bikeiconblue.png')
                });
            }
            else
            {
                this.bikeMarker.setPosition(latlon);
            }
            this.bringMarkerIntoView();
        }
    }
    
    
    bringMarkerIntoView()
    {
        if (this.bikeMarker)
        {
            var bounds = this.googleMap.getBounds();
            var markerPos = this.bikeMarker.getPosition();
            if (!bounds.contains(markerPos))
                this.googleMap.panTo(markerPos);
        }
    }
    
    distance(lat1, lon1, lat2, lon2, unit) {
        var radlat1 = Math.PI * lat1 / 180;
        var radlat2 = Math.PI * lat2 / 180;
        var theta = lon1 - lon2;
        var radtheta = Math.PI * theta / 180;
        var dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
        dist = Math.acos(dist);
        dist = dist * 180 / Math.PI;
        dist = dist * 60 * 1.1515;
        if (unit == "K") { dist = dist * 1.609344; }
        if (unit == "N") { dist = dist * 0.8684; }
        return dist;
    }
    
    findKMLPoint(secs) {
        for (var i = 0; i < this.timeArray.length; i++) {
            if (this.timeArray[i] == secs)
                return i;
            if (this.timeArray[i] > secs)
                if (i > 0)
                    return i - 1;
                else
                    return 0;
        }
        return this.timeArray.length - 1;
    }

    rejectTrack()
    {
        console.warn('Failed to load kml!');
    }

    initTrack(result)
    {
        var kml = result[0];
        var trackNode = kml.getElementsByTagNameNS("http://www.google.com/kml/ext/2.2", "Track")[0];
        var whenNodes = trackNode.getElementsByTagNameNS("*", "when");
        var coordNodes = kml.getElementsByTagNameNS("http://www.google.com/kml/ext/2.2", "coord");
    
        this.timeArray.push(0);
        var date1 = new Date(whenNodes[0].textContent);
    
        for (var i = 1; i < whenNodes.length; i++) {
            var date2 = new Date(whenNodes[i].textContent);
            var span = date2.getTime() - date1.getTime();
            this.timeArray.push(Math.round(span / 1000.0));
        }
    
        for (i = 0; i < coordNodes.length; i++) {
            var coords = coordNodes[i].textContent.split(" ");
            this.lonArray.push(coords[0]);
            this.latArray.push(coords[1]);
        }

        if (coordNodes.length == 0)
            return;    
        
        var mapOptions = {
            mapTypeId: google.maps.MapTypeId.SATELLITE,
            zoom: this.props.zoom,
            center: new google.maps.LatLng(this.latArray[0], this.lonArray[0])
        }
    
        this.googleMap = new google.maps.Map(this._trackComp, mapOptions);

        google.maps.event.addListener(this.googleMap, 'maptypeid_changed', function () {
            if (this.bikeMarker)
                this.bikeMarker.setIcon('http://babaosoftware.com/bikinginstyle.com/images/' + (this.googleMap.getMapTypeId() == google.maps.MapTypeId.SATELLITE ? 'bikeiconyellow.png' : 'bikeiconblue.png'));
        }.bind(this));
    
    
        var bikeLayer = new google.maps.BicyclingLayer();
        bikeLayer.setMap(this.googleMap);
    
        var kmlurl = this.props.trackUrl;
        var ctaLayer = new google.maps.KmlLayer({
            url: kmlurl,
            map: this.googleMap,
            preserveViewport: true,
            suppressInfoWindows: true
        });
    
        // add kml layer mouse events
        ctaLayer.addListener('click', function (kmlMouseEvent) {
            var foundIndex = 0;
            var minDist = 10000;
    
            for (var i = 0; i < this.timeArray.length; i++) {
                var cdis = this.distance(kmlMouseEvent.latLng.lat(), kmlMouseEvent.latLng.lng(), this.latArray[i], this.lonArray[i]);
                if (cdis < minDist) {
                    minDist = cdis;
                    foundIndex = i;
                }
            }
            var latlon = new google.maps.LatLng(this.latArray[foundIndex], this.lonArray[foundIndex]);
            if (this.bikeMarker)
                this.bikeMarker.setPosition(latlon);
            this.player.seekTo(this.timeArray[foundIndex], true);
        }.bind(this));

        //this.onOrientationChange();
        //window.addEventListener("orientationchange", this.onOrientationChange.bind(this));
    }
   
   /*
   onOrientationChange()
   {
       return;
        var orientation = window.orientation;
        var videoCanvas = document.getElementById("video-canvas");
        var mapCanvas = document.getElementById("map-canvas");
    
        if (undefined == orientation || 0 == orientation || 180 == orientation || -180 == orientation)
        {
            videoCanvas.style.width = "100%";
            videoCanvas.style.height = "50%";
    
            mapCanvas.style.width =  "100%";
            mapCanvas.style.height =  "50%";
        }
        else
        {
            videoCanvas.style.width = "50%";
            videoCanvas.style.height = "100%";
    
            mapCanvas.style.width =  "50%";
            mapCanvas.style.height = "100%";
        }
    }
    */
        
}

