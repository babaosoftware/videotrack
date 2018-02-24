'use-strict';

let isMSIE = (navigator.userAgent.indexOf('MSIE') !== -1 || navigator.appVersion.indexOf('Trident/') > 0);
let videoPromise = null;
let mapPromise = null;

if (isMSIE)
{
   /* Microsoft Internet Explorer detected in. */
   window["onYouTubeIframeAPIReady"] = function ()
   {
       videoPromise.resolve();
   }
   videoPromise = $.Deferred();

   window["onMapReady"] = function ()
   {
       mapPromise.resolve();
   }
   mapPromise = $.Deferred();
}
else
{
    videoPromise = new Promise( function (resolve, reject)
    {
        window["onYouTubeIframeAPIReady"] = function ()
        {
            resolve();
        }
    });
    
    mapPromise = new Promise( function (resolve, reject)
    {
        window["onMapReady"] = function ()
        {
            resolve();
        }
    
    });
}    

export { videoPromise, mapPromise };
