var StationSubscription = undefined;
var resizeSeekerbarInterval;

Template.banned.onCreated(function() {
    if (Session.get("rTimeInterval") !== undefined) {
        Meteor.clearInterval(Session.get("rTimeInterval"))
    }
    Session.set("rTimeInterval", Meteor.setInterval(function() {
        Session.set("time", new Date().getTime());
    }, 10000));
    Session.set("ban", Meteor.user().punishments.ban);
});

Template.home.onCreated(function() {
    if (Session.get("minterval") !== undefined) {
        Meteor.clearInterval(Session.get("minterval"));
    }
    if (resizeSeekerbarInterval !== undefined) {
        Meteor.clearInterval(resizeSeekerbarInterval);
        resizeSeekerbarInterval = undefined;
    }
    if (StationSubscription !== undefined) {
        StationSubscription.stop();
    }
    Session.set("type", undefined);
});

Template.loginRegister.onCreated(function() {
    Session.set("github", true);
    Accounts.onLoginFailure(function() {
        if (Session.get("github") === true) {
            var $toastContent = $('<span><strong>Oh Snap!</strong> Something went wrong when trying to log in/register with GitHub. Maybe an account with that username is already registered?</span>');
            Materialize.toast($toastContent, 8000);
        }
    });
});

Template.admin.onCreated(function() {
    Meteor.subscribe("allAlerts");
});

Template.feedback.onCreated(function(){
    Meteor.subscribe("feedback");
})

Template.profile.onCreated(function() {
    var parts = Router.current().url.split('/');
    var username = parts.pop();
    Session.set("loaded", false);
    Meteor.subscribe("userProfiles", username.toLowerCase(), function() {
        if (Meteor.users.find({"profile.usernameL": username.toLowerCase()}).count() === 0) {
            window.location = "/";
        } else {
            var data = Meteor.users.findOne({"profile.usernameL": username.toLowerCase()});
            Session.set("real_name", data.profile.realname);
            Session.set("username", data.profile.username);
            Session.set("first_joined", data.createdAt);
            Session.set("rank", data.profile.rank);
            Session.set("songs_requested", data.profile.statistics.songsRequested);
            Session.set("liked", data.profile.liked);
            Session.set("disliked", data.profile.disliked);
            Session.set("loaded", true);
        }
    });
});

Template.queues.onCreated(function() {
    var tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    var firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    YTPlayer = undefined;
    $(document).keydown(function(evt){
        if (evt.keyCode==83 && (evt.ctrlKey)){
            evt.preventDefault();
            if (Session.get("editing") === true) {
                $("#save-song-button").click();
            }
        }
    });
});

Template.manageStation.onCreated(function() {
    var tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    var firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    YTPlayer = undefined;
    $(document).keydown(function(evt){
        if (evt.keyCode==83 && (evt.ctrlKey)){
            evt.preventDefault();
            if (Session.get("editing") === true) {
                $("#save-song-button").click();
            }
        }
    });
});

Template.manageSongs.onCreated(function() {
    Session.set("showNoGenres", false);
    Session.set("showGenres", true);
    var tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    var firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    YTPlayer = undefined;
    $(document).keydown(function(evt){
        if (evt.keyCode==83 && (evt.ctrlKey)){
            evt.preventDefault();
            if (Session.get("editing") === true) {
                $("#save-song-button").click();
            }
        }
    });
});

Template.room.onCreated(function () {
    Chat.after.find(function(userId, selector) {
        if (selector.type === "global") {
            if (!$("#global-chat-tab").hasClass("active")) {
                $("#global-chat-tab").addClass("unread-messages");
            }
        } else if(selector.type === Session.get("type")) {
            if (!$("#chat-tab").hasClass("active")) {
                $("#chat-tab").addClass("unread-messages");
            }
        }
    });

    Session.set("reportSong", false);
    Session.set("reportTitle", false);
    Session.set("reportAuthor", false);
    Session.set("reportDuration", false);
    Session.set("reportAudio", false);
    Session.set("reportAlbumart", false);
    Session.set("reportOther", false);
    Session.set("si_or_pl", "singleVideo");
    Session.set("editingSong", false);
    var parts = location.href.split('/');
    var id = parts.pop();
    var type = id.toLowerCase();
    if (resizeSeekerbarInterval !== undefined) {
        Meteor.clearInterval(resizeSeekerbarInterval);
        resizeSeekerbarInterval = undefined;
    }
    YTPlayer = undefined;
    Session.set("videoHidden", false);
    var tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    var firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

    Session.set("singleVideo", true);

    var currentSong = undefined;
    var currentSongR = undefined;

    function getTimeElapsed() {
        var type = Session.get("type");
        if (currentSong !== undefined) {
            var room = Rooms.findOne({type: type});
            if (room !== undefined) {
                return Date.now() - currentSong.started - room.timePaused;
            }
        }
        return 0;
    }

    function getSongInfo(songData){
        Session.set("title", songData.title);
        Session.set("artist", songData.artist);
        Session.set("id", songData.id);
        $("#song-img").attr("src", songData.img);
        Session.set("duration", parseInt(songData.duration));
        var d = moment.duration(parseInt(songData.duration), 'seconds');
        $("#time-total").text(d.minutes() + ":" + ("0" + d.seconds()).slice(-2));
        Session.set("timeFormat", d.minutes() + ":" + ("0" + d.seconds()).slice(-2));
        document.title = Session.get("title") + " - " + Session.get("artist") + " - Musare";
    }


    function resizeSeekerbar() {
        if (Session.get("state") === "playing") {
            $(".seeker-bar").width(((getTimeElapsed() / 1000) / Session.get("duration") * 100) + "%");
        }
    }

    function startSong() {
        $("#time-elapsed").text("0:00");
        $("#vote-skip").attr("disabled", false);
        if (currentSong !== undefined) {
            if (YTPlayer !== undefined && YTPlayer.stopVideo !== undefined) YTPlayer.stopVideo();

            var volume = localStorage.getItem("volume") || 20;
            $("#volume_slider").val(volume);

            $("#player").show();
            function loadVideo() {
                if (!Session.get("YTLoaded")) {
                    Session.set("loadVideoTimeout", Meteor.setTimeout(function () {
                        loadVideo();
                    }, 500));
                } else {
                    if (YTPlayer === undefined) {
                        if (YT !== undefined && YT !== null && YT.Player !== undefined) {
                            YTPlayer = new YT.Player("player", {
                                height: 270,
                                width: 480,
                                videoId: currentSong.id,
                                playerVars: {controls: 0, iv_load_policy: 3, rel: 0, showinfo: 0},
                                events: {
                                    'onReady': function (event) {
                                        if (currentSong.skipDuration === undefined) {
                                            currentSong.skipDuration = 0;
                                        }
                                        event.target.seekTo(Number(currentSong.skipDuration) + getTimeElapsed() / 1000);
                                        event.target.playVideo();
                                        event.target.setVolume(volume);
                                        function recursion() {
                                            Meteor.setTimeout(function() {
                                                if (event.target.getPlayerState() === 1 && Session.get("state") === "playing") {
                                                    event.target.seekTo(Number(currentSong.skipDuration) + getTimeElapsed() / 1000);
                                                } else {
                                                    recursion();
                                                }
                                            }, 200);
                                        }
                                        recursion();
                                        resizeSeekerbar();
                                    },
                                    'onStateChange': function (event) {
                                        if (Session.get("YTLoaded")) {
                                            if (event.data == YT.PlayerState.PAUSED && Session.get("state") === "playing") {
                                                event.target.seekTo(Number(currentSong.skipDuration) + getTimeElapsed() / 1000);
                                                event.target.playVideo();
                                            }
                                            if (event.data == YT.PlayerState.PLAYING && Session.get("state") === "paused") {
                                                event.target.seekTo(Number(currentSong.skipDuration) + getTimeElapsed() / 1000);
                                                event.target.pauseVideo();
                                            }
                                        }
                                    }
                                }
                            });
                        } else {
                            setTimeout(function() {
                                startSong();
                            }, 500);
                        }
                    } else {
                        YTPlayer.loadVideoById(currentSong.id);
                        if (currentSong.skipDuration === undefined) {
                            currentSong.skipDuration = 0;
                        }
                        YTPlayer.seekTo(Number(currentSong.skipDuration) + getTimeElapsed() / 1000);
                        $("#vote-skip").removeClass("disabled");
                    }
                    Session.set("pauseVideo", false);
                    getSongInfo(currentSong);
                }
            }
            loadVideo();
        }
    }

    Session.set("loaded", false);
    Meteor.subscribe("rooms", function() {
        var parts = location.href.split('/');
        var id = parts.pop();
        var type = id.toLowerCase();
        Session.set("type", type);
        if (Rooms.find({type: type}).count() !== 1) {
            window.location = "/";
        } else {
            StationSubscription = Meteor.subscribe(type);
            Session.set("loaded", true);
            Session.set("minterval", Meteor.setInterval(function () {
                var room = Rooms.findOne({type: type});
                if (room !== undefined) {
                    if (room.state === "paused" || Session.get("pauseVideo")) {
                        Session.set("state", "paused");
                        // TODO Fix issue where sometimes nothing loads with the YT is not defined error. The error points to around this.
                        if (YTPlayer !== undefined && YTPlayer.getPlayerState !== undefined && YTPlayer.getPlayerState() === 1) {
                            YTPlayer.pauseVideo();
                        }
                    } else {
                        Session.set("state", "playing");
                        if (YTPlayer !== undefined && YTPlayer.getPlayerState !== undefined && YTPlayer.getPlayerState() !== 1) {
                            YTPlayer.playVideo();
                        }
                    }
                }

                if (currentSongR === undefined || room.currentSong.started !== currentSongR.started) {
                    Session.set("previousSong", currentSong);
                    currentSongR = room.currentSong;

                    currentSong = room.currentSong.song;
                    currentSong.started = room.currentSong.started;
                    Session.set("currentSong", currentSong);
                    Meteor.clearTimeout(Session.get("loadVideoTimeout"));
                    startSong();
                }

                if (currentSong !== undefined) {
                    if (room !== undefined) {
                        var duration = (Date.now() - currentSong.started - room.timePaused) / 1000;
                        var song_duration = currentSong.duration;
                        if (song_duration <= duration) {
                            Session.set("pauseVideo", true);
                        } else if (Session.get("pauseVideo") === true) {
                            Session.set("pauseVideo", false);
                        }
                        var d = moment.duration(duration, 'seconds');
                        if (Session.get("state") === "playing") {
                            $("#time-elapsed").text(d.minutes() + ":" + ("0" + d.seconds()).slice(-2));
                        }
                    }
                }
            }, 100));
            resizeSeekerbarInterval = Meteor.setInterval(function () {
                resizeSeekerbar();
            }, 500)
        }
    });
    Meteor.setTimeout(function(){
        $("#playlist-slideout").on("click", function(){
            if($("#chat-slide-out").css("right") === "0px"){
                $("#chat-slideout").sideNav("hide");
            }
            else if($("#users-slide-out").css("right") === "0px"){
                $("#users-slideout").sideNav("hide");
            }
            var marginRightWidth = ($(document).width() - $(".container").width()) / 2 + "px";
            $(".room-container").css("margin-right", "370px")
            if($("#playlist-slide-out").css("right") === "0px"){
                $(".room-container").css("margin-right", marginRightWidth);
            }
        });
        $("#chat-slideout").on("click", function(){
            if($("#playlist-slide-out").css("right") === "0px"){
                $("#playlist-slideout").sideNav("hide");
            }
            else if($("#users-slide-out").css("right") === "0px"){
                $("#users-slideout").sideNav("hide");
            }
            var marginRightWidth = ($(document).width() - $(".container").width()) / 2 + "px";
            $(".chat-ul").scrollTop(1000000);
            $(".room-container").css("margin-right", "370px")
            if($("#chat-slide-out").css("right") === "0px"){
                $(".room-container").css("margin-right", marginRightWidth);
            }
        });
        $("#users-slideout").on("click", function(){
            if($("#playlist-slide-out").css("right") === "0px"){
                $("#playlist-slideout").sideNav("hide");
            }
            else if($("#chat-slide-out").css("right") === "0px"){
                $("#chat-slideout").sideNav("hide");
            }
            var marginRightWidth = ($(document).width() - $(".container").width()) / 2 + "px";
            $(".room-container").css("margin-right", "370px")
            if($("#users-slide-out").css("right") === "0px"){
                $(".room-container").css("margin-right", marginRightWidth);
            }
        });
        $("body").on("click", function(e){

        });
        $(window).on("resize", function(){
            var marginRightWidth = ($(document).width() - $(".container").width()) / 2 + "px";
            $(".container").css("margin-right", marginRightWidth);
        })
    }, 1000);
});

Template.communityStation.onCreated(function () {
    Chat.after.find(function(userId, selector) {
        if (selector.type === "global") {
            if (!$("#global-chat-tab").hasClass("active")) {
                $("#global-chat-tab").addClass("unread-messages");
            }
        }
    });

    var parts = location.href.split('/');
    var id = parts.pop();
    var name = id.toLowerCase();
    if (resizeSeekerbarInterval !== undefined) {
        Meteor.clearInterval(resizeSeekerbarInterval);
        resizeSeekerbarInterval = undefined;
    }
    YTPlayer = undefined;
    Session.set("videoHidden", false);
    var tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    var firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

    Session.set("singleVideo", true);

    var currentSong = undefined;
    var currentSongR = undefined;

    function getTimeElapsed() {
        var name = Session.get("CommunityStationName");
        if (currentSong !== undefined) {
            var room = CommunityStations.findOne({name: name});
            if (room !== undefined) {
                return Date.now() - currentSong.started - room.timePaused;
            }
        }
        return 0;
    }

    function getSongInfo(songData){
        Session.set("title", songData.title);
        Session.set("id", songData.id);
        Session.set("duration", parseInt(songData.duration));
        var d = moment.duration(parseInt(songData.duration), 'seconds');
        $("#time-total").text(d.minutes() + ":" + ("0" + d.seconds()).slice(-2));
        Session.set("timeFormat", d.minutes() + ":" + ("0" + d.seconds()).slice(-2));
        document.title = Session.get("title") + " - Musare";
    }

    function resizeSeekerbar() {
        if (Session.get("state") === "playing") {
            $(".seeker-bar").width(((getTimeElapsed() / 1000) / Session.get("duration") * 100) + "%");
        }
    }

    function startSong() {
        $("#time-elapsed").text("0:00");
        $("#vote-skip").attr("disabled", false);
        if (currentSong !== undefined) {
            if (YTPlayer !== undefined && YTPlayer.stopVideo !== undefined && YTPlayer.getPlayerState() === YT.PlayerState.PLAYING) YTPlayer.stopVideo();

            var volume = localStorage.getItem("volume") || 20;

            $("#volume_slider").val(volume);
            $("#player").show();
            function loadVideo() {
                if (!Session.get("YTLoaded")) {
                    Session.set("loadVideoTimeout", Meteor.setTimeout(function () {
                        loadVideo();
                    }, 500));
                } else {
                    if (YTPlayer === undefined) {
                        if (YT !== undefined && YT !== null && YT.Player !== undefined) {
                            YTPlayer = new YT.Player("player", {
                                height: 270,
                                width: 480,
                                videoId: currentSong.id,
                                playerVars: {controls: 0, iv_load_policy: 3, rel: 0, showinfo: 0},
                                events: {
                                    'onReady': function (event) {
                                        event.target.seekTo(getTimeElapsed() / 1000);
                                        event.target.playVideo();
                                        event.target.setVolume(volume);
                                        function recursion() {
                                            Meteor.setTimeout(function() {
                                                if (event.target.getPlayerState() === 1 && Session.get("state") === "playing") {
                                                    event.target.seekTo(getTimeElapsed() / 1000);
                                                } else {
                                                    recursion();
                                                }
                                            }, 200);
                                        }
                                        recursion();
                                        resizeSeekerbar();
                                    },
                                    'onStateChange': function (event) {
                                        if (Session.get("YTLoaded")) {
                                            if (event.data == YT.PlayerState.PAUSED && Session.get("state") === "playing" && !Session.get("noCurrentSong")) {
                                                event.target.seekTo(getTimeElapsed() / 1000);
                                                event.target.playVideo();
                                            }
                                            if (event.data == YT.PlayerState.PLAYING && Session.get("state") === "paused") {
                                                event.target.seekTo(getTimeElapsed() / 1000);
                                                event.target.pauseVideo();
                                            }
                                        }
                                    }
                                }
                            });
                        } else {
                            setTimeout(function() {
                                startSong();
                            }, 500);
                        }
                    } else {
                        YTPlayer.loadVideoById(currentSong.id);
                        YTPlayer.seekTo(getTimeElapsed() / 1000);
                        $("#vote-skip").removeClass("disabled");
                    }
                    Session.set("pauseVideo", false);
                    getSongInfo(currentSong);
                }
            }
            loadVideo();
        }
    }

    Session.set("loaded", false);
    Meteor.subscribe("community_stations", function() {
        var parts = location.href.split('/');
        var id = parts.pop();
        var name = id.toLowerCase();
        Session.set("CommunityStationName", name);
        if (CommunityStations.find({name: name}).count() !== 1) {
            window.location = "/";
        } else {
            StationSubscription = Meteor.subscribe("pr_" + name);
            Session.set("loaded", true);
            Session.set("minterval", Meteor.setInterval(function () {
                var room = CommunityStations.findOne({name: name});
                if (room !== undefined) {
                    if (room.state === "paused" || Session.get("pauseVideo")) {
                        Session.set("state", "paused");
                        // TODO Fix issue where sometimes nothing loads with the YT is not defined error. The error points to around this.
                        if (YTPlayer !== undefined && YTPlayer.getPlayerState !== undefined && YTPlayer.getPlayerState() === 1) {
                            YTPlayer.pauseVideo();
                        }
                    } else {
                        Session.set("state", "playing");
                        if (YTPlayer !== undefined && YTPlayer.getPlayerState !== undefined && YTPlayer.getPlayerState() !== 1 && !Session.get("noCurrentSong")) {
                            YTPlayer.playVideo();
                        }
                    }
                }

                if (currentSongR === undefined || room.currentSong.started !== currentSongR.started) {
                    Session.set("previousSong", currentSong);
                    if (currentSong !== undefined) {
                        var coStation = CommunityStations.findOne({name: name});
                        if (coStation.partyModeEnabled) {
                            var hasSongInQueue = false;
                            coStation.queue.forEach(function (queueSong) {
                                if (Meteor.userId() === queueSong.requestedBy) {
                                    hasSongInQueue = true;
                                }
                            });
                            if (!hasSongInQueue) {
                                var playlistQueueName = Session.get("playlistQueueName");
                                var playlistQueueCurrentSong = Session.get("playlistQueueCurrentSong");
                                if (playlistQueueCurrentSong !== undefined) {
                                    if (playlistQueueCurrentSong.id === currentSong.id) {
                                        if (playlistQueueName !== undefined) {
                                            // If someone selects a different playlist this won't work. This is fine.
                                            Meteor.call("moveVideoToBottomOfPrivatePlaylist", playlistQueueName, playlistQueueCurrentSong.id, function () {
                                                var pl = PrivatePlaylists.findOne({
                                                    owner: Meteor.userId(),
                                                    name: playlistQueueName
                                                });
                                                if (pl !== undefined) {
                                                    var plSongs = pl.songs;
                                                    var plSong;

                                                    if (plSongs.length === 1) {
                                                        plSong = plSongs[0];
                                                    } else if (plSongs.length > 1) {
                                                        if (plSongs[0].id === playlistQueueCurrentSong.id) {
                                                            plSong = plSongs[1];
                                                        } else {
                                                            plSong = plSongs[0];
                                                        }
                                                    }

                                                    // Add song to queue
                                                    if (plSong !== undefined) {
                                                        var isAlreadyInQueue = false;
                                                        coStation.queue.forEach(function (queueSong) {
                                                            if (plSong.id === queueSong.song.id) {
                                                                isAlreadyInQueue = true;
                                                            }
                                                        });
                                                        if (isAlreadyInQueue) {
                                                            // If the song we want to add is already in the queue, we moved the song to the bottom a new song will get added next song.
                                                            Meteor.call("moveVideoToBottomOfPrivatePlaylist", playlistQueueName, plSong.id, function () {});
                                                            Session.set("playlistQueueCurrentSong", undefined);
                                                            var $toastContent = $('<span>The top song in your selected playlist is already in the playlist. We will attempt to add a different song when the current song ends.</span>');
                                                            Materialize.toast($toastContent, 8000);
                                                        } else {
                                                            Meteor.call("addSongToCommunityStationQueue", Session.get("CommunityStationName"), plSong.id, function (err) {
                                                                if (!err) {
                                                                    Session.set("playlistQueueCurrentSong", plSong);
                                                                }
                                                            });
                                                        }
                                                    }
                                                }
                                            });
                                        }
                                    } else {
                                        var contains = false;
                                        coStation.queue.forEach(function (queueSong) {
                                            if (playlistQueueCurrentSong.id === queueSong.song.id) {
                                                contains = true;
                                            }
                                        });
                                        if (!contains) {
                                            var pl = PrivatePlaylists.findOne({
                                                owner: Meteor.userId(),
                                                name: playlistQueueName
                                            });
                                            if (pl !== undefined) {
                                                var plSongs = pl.songs;
                                                var plSong = plSongs[0];
                                                // Add song to queue
                                                if (plSong !== undefined) {
                                                    Meteor.call("addSongToCommunityStationQueue", Session.get("CommunityStationName"), plSong.id, function (err) {
                                                        if (!err) {
                                                            Session.set("playlistQueueCurrentSong", plSong);
                                                        }
                                                    });
                                                }
                                            }
                                        }
                                    }
                                } else {
                                    var pl = PrivatePlaylists.findOne({
                                        owner: Meteor.userId(),
                                        name: playlistQueueName
                                    });
                                    if (pl !== undefined) {
                                        var plSongs = pl.songs;
                                        var plSong = plSongs[0];
                                        // Add song to queue
                                        if (plSong !== undefined) {
                                            Meteor.call("addSongToCommunityStationQueue", Session.get("CommunityStationName"), plSong.id, function (err) {
                                                if (!err) {
                                                    Session.set("playlistQueueCurrentSong", plSong);
                                                }
                                            });
                                        }
                                    }
                                }
                            }
                        }
                    }
                    currentSongR = room.currentSong;

                    if (!_.isEqual(currentSongR, {})) {
                        Session.set("noCurrentSong", false);
                        currentSong = room.currentSong.song;
                        currentSong.started = room.currentSong.started;
                        Session.set("currentSong", currentSong);
                        Meteor.clearTimeout(Session.get("loadVideoTimeout"));
                        startSong();
                    } else {
                        if (YTPlayer !== undefined && YTPlayer.stopVideo !== undefined && YTPlayer.getPlayerState() === YT.PlayerState.PLAYING) YTPlayer.stopVideo();
                        document.title = "Musare";
                        Session.set("noCurrentSong", true);
                    }
                }

                if (currentSong !== undefined && !Session.get("noCurrentSong")) {
                    if (room !== undefined) {
                        var duration = (Date.now() - currentSong.started - room.timePaused) / 1000;
                        var song_duration = currentSong.duration;
                        if (song_duration <= duration) {
                            Session.set("pauseVideo", true);
                        } else if (Session.get("pauseVideo") === true) {
                            Session.set("pauseVideo", false);
                        }
                        var d = moment.duration(duration, 'seconds');
                        if (Session.get("state") === "playing") {
                            $("#time-elapsed").text(d.minutes() + ":" + ("0" + d.seconds()).slice(-2));
                        }
                    }
                }
            }, 100));
            resizeSeekerbarInterval = Meteor.setInterval(function () {
                resizeSeekerbar();
            }, 500)
        }
    });
    Meteor.setTimeout(function(){
        $("#playlist-slideout").on("click", function(){
            if($("#chat-slide-out").css("right") === "0px"){
                $("#chat-slideout").sideNav("hide");
            }
            else if($("#users-slide-out").css("right") === "0px"){
                $("#users-slideout").sideNav("hide");
            }
            else if($("#allowed-slide-out").css("right") === "0px"){
                $("#allowed-slideout").sideNav("hide");
            }
            else if($("#playlists-slide-out").css("right") === "0px"){
                $("#playlists-slideout").sideNav("hide");
            }
            var marginRightWidth = ($(document).width() - $(".container").width()) / 2 + "px";
            $(".room-container").css("margin-right", "370px")
            if($("#playlist-slide-out").css("right") === "0px"){
                $(".room-container").css("margin-right", marginRightWidth);
            }
        });
        $("#chat-slideout").on("click", function(){
            if($("#playlist-slide-out").css("right") === "0px"){
                $("#playlist-slideout").sideNav("hide");
            }
            else if($("#users-slide-out").css("right") === "0px"){
                $("#users-slideout").sideNav("hide");
            }
            else if($("#allowed-slide-out").css("right") === "0px"){
                $("#allowed-slideout").sideNav("hide");
            }
            else if($("#playlists-slide-out").css("right") === "0px"){
                $("#playlists-slideout").sideNav("hide");
            }
            var marginRightWidth = ($(document).width() - $(".container").width()) / 2 + "px";
            $(".chat-ul").scrollTop(1000000);
            $(".room-container").css("margin-right", "370px")
            if($("#chat-slide-out").css("right") === "0px"){
                $(".room-container").css("margin-right", marginRightWidth);
            }
        });
        $("#users-slideout").on("click", function(){
            if($("#playlist-slide-out").css("right") === "0px"){
                $("#playlist-slideout").sideNav("hide");
            }
            else if($("#chat-slide-out").css("right") === "0px"){
                $("#chat-slideout").sideNav("hide");
            }
            else if($("#allowed-slide-out").css("right") === "0px"){
                $("#allowed-slideout").sideNav("hide");
            }
            else if($("#playlists-slide-out").css("right") === "0px"){
                $("#playlists-slideout").sideNav("hide");
            }
            var marginRightWidth = ($(document).width() - $(".container").width()) / 2 + "px";
            $(".room-container").css("margin-right", "370px")
            if($("#users-slide-out").css("right") === "0px"){
                $(".room-container").css("margin-right", marginRightWidth);
            }
        });
        $("#allowed-slideout").on("click", function(){
            if($("#playlist-slide-out").css("right") === "0px"){
                $("#playlist-slideout").sideNav("hide");
            }
            else if($("#chat-slide-out").css("right") === "0px"){
                $("#chat-slideout").sideNav("hide");
            }
            else if($("#users-slide-out").css("right") === "0px"){
                $("#users-slideout").sideNav("hide");
            }
            else if($("#playlists-slide-out").css("right") === "0px"){
                $("#playlists-slideout").sideNav("hide");
            }
            var marginRightWidth = ($(document).width() - $(".container").width()) / 2 + "px";
            $(".room-container").css("margin-right", "370px")
            if($("#allowed-slide-out").css("right") === "0px"){
                $(".room-container").css("margin-right", marginRightWidth);
            }
        });
        $("#playlists-slideout").on("click", function(){
            if($("#playlist-slide-out").css("right") === "0px"){
                $("#playlist-slideout").sideNav("hide");
            }
            else if($("#chat-slide-out").css("right") === "0px"){
                $("#chat-slideout").sideNav("hide");
            }
            else if($("#users-slide-out").css("right") === "0px"){
                $("#users-slideout").sideNav("hide");
            }
            else if($("#allowed-slide-out").css("right") === "0px"){
                $("#allowed-slideout").sideNav("hide");
            }
            var marginRightWidth = ($(document).width() - $(".container").width()) / 2 + "px";
            $(".room-container").css("margin-right", "370px")
            if($("#playlists-slide-out").css("right") === "0px"){
                $(".room-container").css("margin-right", marginRightWidth);
            }
        });
        $("body").on("click", function(e){

        });
        $(window).on("resize", function(){
            var marginRightWidth = ($(document).width() - $(".container").width()) / 2 + "px";
            $(".container").css("margin-right", marginRightWidth);
        })
    }, 1000);
});

Template.settings.onCreated(function() {
    $(document).ready(function() {
        var user = Meteor.user();
        function initSettings() {
            if (user !== undefined) {
                if (user.profile.settings && user.profile.settings.showRating === true) {
                    function setChecked() {
                        $("#showRating").prop("checked", true);
                        if (!$("#showRating").prop("checked")) {
                            Meteor.setTimeout(function() {
                                setChecked();
                            }, 100);
                        }
                    }
                    setChecked();
                }
            } else {
                Meteor.setTimeout(function() {
                    initSettings();
                }, 500);
            }
        }
        initSettings();
    });
});
