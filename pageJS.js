const AUTHORIZE = 'https://accounts.spotify.com/authorize';
const TOKEN = "https://accounts.spotify.com/api/token";
const DEVICES = "https://api.spotify.com/v1/me/player/devices";
const PLAYER = "https://api.spotify.com/v1/me/player";
const PLAY = 'https://api.spotify.com/v1/me/player/play';
const PLAYLISTS = "https://api.spotify.com/v1/me/playlists";
const SINGLEPLAYLIST = 'https://api.spotify.com/v1/playlists'
const PAUSE = 'https://api.spotify.com/v1/me/player/pause';
const PREVIOUS = 'https://api.spotify.com/v1/me/player/previous';
const NEXT = 'https://api.spotify.com/v1/me/player/next';
const TRACK = 'https://api.spotify.com/v1/tracks';
const ALBUMS = 'https://api.spotify.com/v1/albums'
const CURRENTLYPLAYING = 'https://api.spotify.com/v1/me/player/currently-playing';

let redirect_uri = 'https://jmarin123.github.io/spotifyAPITest/'
let client_id = '';
let client_secret = '';
let currentPlaylist;

const onPageLoad = () => {
    client_id = localStorage.getItem("client_id");
    client_secret = localStorage.getItem("client_secret");
    if (window.location.search.length > 0) {
        handleRedirect();
    }
    else {
        access_token = localStorage.getItem("access_token");
        if (access_token == null) {
            document.getElementById("setup-page").style.display = 'block';
        }
        else {
            document.getElementById("setup-page").style.display = 'none';
            document.getElementById("devices-setup").style.display = 'inline';
            refreshDevices();
            refreshPlaylists();
            refereshSongs();
            currentlyPlaying();
        }
    }
}

function handleRedirect() {
    let code = getCode();
    fetchAccessToken(code);
    window.history.pushState("", "", redirect_uri);
}

function getCode() {
    let code = null;
    const queryString = window.location.search;
    if (queryString.length > 0) {
        const urlParams = new URLSearchParams(queryString);
        code = urlParams.get('code')
    }
    return code;
}

function fetchAccessToken(code) {
    let body = "grant_type=authorization_code";
    body += "&code=" + code;
    body += "&redirect_uri=" + encodeURI(redirect_uri);
    body += "&client_id=" + client_id;
    body += "&client_secret=" + client_secret;
    callAuthorizationApi(body);
}

function callAuthorizationApi(body) {
    let xhr = new XMLHttpRequest();
    xhr.open("POST", TOKEN, true);
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    xhr.setRequestHeader('Authorization', 'Basic ' + btoa(client_id + ":" + client_secret));
    xhr.send(body);
    xhr.onload = handleAuthorizationResponse;
}


function refreshPlaylists() {
    callApi("GET", PLAYLISTS, null, handlePlaylistsResponse);
}

function handlePlaylistsResponse() {
    if (this.status == 200) {
        var data = JSON.parse(this.responseText);
        removeAllItems("playlists");
        removeAllItems("listed-playlists");
        data.items.forEach(item => {
            addItems(item, 'playlists')
            addItems(item, 'listed-playlists');
        });
        document.getElementById('playlists').value = currentPlaylist;
        document.getElementById('listed-playlists').value = currentPlaylist;
    }
    else if (this.status == 401) {
        refreshAccessToken()
    }
    else {
        console.log(this.responseText);
        alert(this.responseText);
    }
}


function handleAuthorizationResponse() {
    if (this.status == 200) {
        let data = JSON.parse(this.responseText);
        if (data.access_token != undefined) {
            access_token = data.access_token;
            localStorage.setItem("access_token", access_token);
        }
        if (data.refresh_token != undefined) {
            refresh_token = data.refresh_token;
            localStorage.setItem("refresh_token", refresh_token);
        }
        onPageLoad();
    }
    else {
        console.log(this.responseText);
        alert(this.responseText);
    }
}


const requestAuthorization = () => {
    client_id = document.getElementById("clientId").value;
    client_secret = document.getElementById("clientSecret").value;
    localStorage.setItem("client_id", client_id);
    localStorage.setItem("client_secret", client_secret); // In a real app you should not expose your client_secret to the user

    let url = AUTHORIZE;
    url += "?client_id=" + client_id;
    url += "&response_type=code";
    url += "&redirect_uri=" + encodeURI(redirect_uri);
    url += "&show_dialog=true";
    url += "&scope=user-read-private user-read-email user-modify-playback-state user-read-playback-position user-library-read streaming user-read-playback-state user-read-recently-played playlist-read-private playlist-modify-public playlist-modify-private";
    window.location.href = url;
}


function play() {
    let song = document.getElementById("songs");
    if (song) {
        let songIndex = song.selectedIndex;
        console.log("this is song index " + songIndex);
        song = song.options[song.selectedIndex].value;
        let playlist_id = currentPlaylist.value;
        let body = {};

        body.context_uri = "spotify:playlist:" + playlist_id;
        body.offset = {};
        body.offset.position_ms = 0;
        body.offset.position = songIndex;
        callApi("PUT", PLAY + "?device_id=" + getCurrentDevice(), JSON.stringify(body), handleApiResponse);
    } else {
        callApi("PUT", PLAY + "?device_id=" + getCurrentDevice(), null, handleApiResponse);
    }
}

function setCurrentPlaylist() {
    let playlist = document.getElementById('playlists');
    currentPlaylist = playlist.options[playlist.selectedIndex].value;
}

function next() {
    callApi("POST", NEXT + "?device_id=" + getCurrentDevice(), null, handleApiResponse);
}

function previous() {
    callApi("POST", PREVIOUS + "?device_id=" + getCurrentDevice(), null, handleApiResponse);
}

function pause() {
    callApi("PUT", PAUSE + "?device_id=" + getCurrentDevice(), null, handleApiResponse);
}


function refreshDevices() {
    callApi('GET', DEVICES, null, handleDevicesResponse);
}

function refereshPlaylists() {
    callApi('GET', PLAYLISTS, null, handlePlaylistResponse)
}

function refereshSongs() {
    currentPlaylist = document.getElementById('playlists')

    if (currentPlaylist.options[currentPlaylist.selectedIndex]) {
        callApi('GET', SINGLEPLAYLIST + `/${currentPlaylist.options[currentPlaylist.selectedIndex].value}`, null, handleSongResponse)
    } else {
        //tells user to actually request playlist
    }
}

function getCurrentDevice() {
    const currentDevices = document.getElementById('devices')
    return currentDevices.options[currentDevices.selectedIndex].value;
}


function handleApiResponse() {
    if (this.status == 200 || this.status == 204) {
        console.log(this.responseText);
        setTimeout(currentlyPlaying, 100);
    }
    else if (this.status == 401) {
        refreshAccessToken()
    }
    else {
        console.log(this.responseText);
        alert(this.responseText);
    }
}

function currentlyPlaying() {
    callApi("GET", PLAYER + "?market=US", null, handleCurrentlyPlayingResponse);
}

function handleCurrentlyPlayingResponse() {
    if (this.status == 200) {
        var data = JSON.parse(this.responseText);
        if (data.item != null) {
            document.getElementById("albumImage").src = data.item.album.images[0].url;
            document.getElementById("trackTitle").innerHTML = data.item.name;
            document.getElementById("trackArtist").innerHTML = data.item.artists[0].name;
        }
        if (data.device != null) {
            let currentDevice = data.device.id;
            document.getElementById('devices').value = currentDevice;
        }

        // if (data.context != null) {
        //     currentPlaylist = data.context.uri;
        //     currentPlaylist = currentPlaylist.substring(currentPlaylist.lastIndexOf(":") + 1, currentPlaylist.length);
        //     document.getElementById('playlists').value = currentPlaylist;
        // }
    }
    else if (this.status == 204) {

    }
    else if (this.status == 401) {
        refreshAccessToken()
    } else if (this.status == 403) {

    } else {
        console.log(this.responseText);
        alert(this.responseText);
    }
}

function handleSongResponse() {
    if (this.status == 200) {
        let data = JSON.parse(this.responseText);
        removeAllItems("songs");
        data.tracks.items.forEach(item => addItems(item.track, 'songs'));
    }
    else if (this.status == 401) {
        refreshAccessToken();
    }
    else {
        console.log(this.responseText);
        alert(this.responseText);
    }
}


function handlePlaylistResponse() {
    if (this.status == 200) {
        let data = JSON.parse(this.responseText);
        removeAllItems("playlists");
        data.items.forEach(item => addItems(item, 'playlists'));
        removeAllItems("listed-playlists");
        data.items.forEach(item => addItems(item, 'listed-playlists'));
    }
    else if (this.status == 401) {
        refreshAccessToken();
    }
    else {
        console.log(this.responseText);
        alert(this.responseText);
    }
}

function handleDevicesResponse() {
    if (this.status == 200) {
        let data = JSON.parse(this.responseText);
        removeAllItems("devices");
        data.devices.forEach(item => addItems(item, 'devices'));
    }
    else if (this.status == 401) {
        refreshAccessToken();
    }
    else {
        console.log(this.responseText);
        alert(this.responseText);
    }
}
function createPlaylist() {
    callApi('GET', 'https://api.spotify.com/v1/me', null, handlePlaylist);
}
function handlePlaylist() {
    if (this.status == 200) {
        let playlistName = document.getElementById('nameForPlaylist').value;
        let data = JSON.parse(this.responseText);
        if (!playlistName) {
            playlistName = 'default name';
        }
        let body = {}
        body.name = playlistName;
        body.description = document.getElementById('descriptionForPlaylist').value;
        document.getElementById('publicPlaylist').checked ? body.public = true : body.public = false;
        callApi('POST', 'https://api.spotify.com/v1/users/' + data.id + '/playlists', JSON.stringify(body), handleCreatePlaylist)
    } else if (this.status == 401) {
        refreshAccessToken();
    } else {
        console.log(this.responseText);
        alert(this.responseText);
    }
}

function handleCreatePlaylist() {
    if (this.status == 201) {
        document.getElementById('nameForPlaylist').value = '';
        document.getElementById('descriptionForPlaylist').value = ''
        document.getElementById('publicPlaylist').checked = false;
        refreshPlaylists();
    }
    else if (this.status == 401) {
        refreshAccessToken();
    }
    else {
        console.log(this.responseText);
        alert(this.responseText);
    }
}


function addSongToPlaylist() {
    callApi('GET', CURRENTLYPLAYING, null, handleCurrentlyPlayingForPlaylist)
}

function handleCurrentlyPlayingForPlaylist() {
    if (this.status == 200) {
        let data = JSON.parse(this.responseText);
        let selectingPlaylist = document.getElementById('listed-playlists');
        if (selectingPlaylist.options.length > 0) {
            let body = {}
            body.uris = [];
            body.uris.push('spotify:track:' + data.item.id);
            callApi('POST', 'https://api.spotify.com/v1/playlists/' + selectingPlaylist.options[selectingPlaylist.selectedIndex].value + '/tracks', JSON.stringify(body), handlePostForPlaylist);
        }
    }
    else if (this.status == 401) {
        refreshAccessToken();
    }
    else {
        console.log(this.responseText);
        alert(this.responseText);
    }
}
function handlePostForPlaylist() {
    if (this.status == 201) {
        refereshSongs();
    } else if (this.status == 401) {
        refreshAccessToken();
    } else {
        console.log(this.responseText);
        alert(this.responseText);
    }
}
function refreshAccessToken() {
    refresh_token = localStorage.getItem("refresh_token");
    let body = "grant_type=refresh_token";
    body += "&refresh_token=" + refresh_token;
    body += "&client_id=" + client_id;
    callAuthorizationApi(body);
}

const callApi = (method, url, body, callback) => {
    let xhr = new XMLHttpRequest();
    xhr.open(method, url, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Authorization', 'Bearer ' + access_token);
    xhr.send(body);
    xhr.onload = callback;
}


function removeAllItems(elementId) {
    let node = document.getElementById(elementId);
    while (node.firstChild) {
        node.removeChild(node.firstChild);
    }
}

function addItems(item, element) {
    let node = document.createElement("option");
    node.value = item.id;
    node.innerHTML = item.name;
    document.getElementById(element).appendChild(node);
}
