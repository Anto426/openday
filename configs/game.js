$(function () {


    var canvasObject = $("#Canvas");

    var gameLoopIntervalID = 0;
    var Paused = true;

    var Lost = false;

    function pauseGame() {
        clearInterval(gameLoopIntervalID);
        $(".Pipe").addClass("paused");
        $("#PauseButton span")
            .removeClass("glyphicon-pause")
            .addClass("glyphicon-play");
        Paused = true;
    }

    function startGame() {
        if (Lost) return;
        gameLoopIntervalID = setInterval(function () {
            gameLoop();
        }, 30);
        $(".Pipe").removeClass("paused");
        $("#PauseButton span")
            .removeClass("glyphicon-play")
            .addClass("glyphicon-pause");
        Paused = false;
    }

    function endGame() {
        Lost = true;
        pauseGame();
        var cookieScore = getCookie("HighScore");
        console.log(Math.max(CurrentScore, cookieScore));
        console.log(cookieScore);
        setCookie("HighScore", Math.max(CurrentScore, cookieScore), 30000);
        Birdy.BirdyObject.animate({ top: "90%" }, 1500, "linear");
        $("#FinalScore").html(CurrentScore);
        $("#LostScoreScreen").slideDown();
    }

    function resetGame() {
        pauseGame();
        $(".Pipe").remove();
        Lost = false;
        CurrentScore = 0;
        Birdy.Reset();
        startGame();
        $("#LostScoreScreen").slideUp();
    }


    function togglePause() {
        if (!Paused) {
            pauseGame();
        } else {
            startGame();
        }
    }

    var CurrentScore = 0;

    $("#PauseButton").mousedown(function (event) {
        event.stopPropagation();
        togglePause();
    });

    $("#ResetButton").click(function () {
        resetGame();
    });

    canvasObject.mousedown(function () {
        Birdy.jump();
    });

    $("body").keydown(function (event) {
        console.log(event.which == 49)

        switch (event.which) {
            case 49:
                resetGame();
                break;
            case 50:
                togglePause();
                break;
            default:
                Birdy.jump();
                break;
        }
    });


    var gameLoopCounter = 0;

    function gameLoop() {
        if (gameLoopCounter % 2 === 0) {

            incrementScore();
            checkCollisions();
        }

        isInBound(Birdy.BirdyObject, canvasObject);
        Birdy.fall();


        if (gameLoopCounter % 90 === 0) {
            addPipe();
            cleanPipes();
        }

        if (gameLoopCounter % 7 === 0) {

            Birdy.flapWings();
        }

        gameLoopCounter++;
    }

    var Birdy = new (function () {
        var selectorObject = $("#Birdy");

        var jumping = false;

        var gravVeloc = 0;

        var gravAccel = 0.3;

        var terminalVelocity = 5;


        var Angle = 0;


        var WingPosition = 0;


        var WingPositions = [0, 1, 2, 1];

        this.Reset = function () {
            jumping = false;
            gravVeloc = 0;
            Angle = 0;
            WingPosition = 0;
            selectorObject.stop().rotate(0).css("top", "50%");
        };

        this.fall = function () {
            if (!jumping) {
                selectorObject
                    .stop()
                    .animate({ top: "+=" + gravVeloc + "%" }, 30, "linear");
                gravVeloc += gravAccel;

                if (gravVeloc > terminalVelocity) {
                    gravVeloc = terminalVelocity;
                }
                var AdjustedAngle =
                    (Angle + 15 * (gravVeloc / terminalVelocity)) ^ 2;
                adjustAngle(Math.min(AdjustedAngle, 90));
                $("#DebugInfo").html("Gravity: " + gravVeloc);
            } else {
                gravVeloc = 0;

            }
        };

        this.jump = function () {
            if (Paused) {

                return;
            }
            jumping = true;
            adjustAngle(-45);
            selectorObject
                .stop()
                .animate({ top: "-=9%" }, 100, "linear", function () {

                    jumping = false;
                    Birdy.fall();
                });
        };

        this.flapWings = function () {
            WingPosition++;

            if (Angle > 45) {

                WingPosition = 1;
            }

            selectorObject.css(
                "background-position-x",
                WingPositions[WingPosition % 4] * 50 + "%"
            );
        };

        function adjustAngle(angle) {
            selectorObject.rotate(angle);
            Angle = angle;
        }

        this.BirdyObject = selectorObject;
    })();


    function addPipe() {
        var PipeGap = 30,
            MinPipeHeight = 5;

        var MaxTopPipeHeight = 100 - PipeGap - 2 * MinPipeHeight;
        var TopPipeHeight = Math.random() * MaxTopPipeHeight + MinPipeHeight;
        var BottomPipeTop = TopPipeHeight + PipeGap;
        var BottomPipeHeight = 100 - BottomPipeTop;


        $("<div/>")
            .addClass("Pipe")
            .css("height", TopPipeHeight + "%")
            .data("scored", false)
            .appendTo(canvasObject);

        $("<div/>")
            .addClass("Pipe BottomPipe")
            .css({ height: BottomPipeHeight + "%", top: BottomPipeTop + "%" })
            .data("scored", false)
            .appendTo(canvasObject);
    }


    function cleanPipes() {
        $(".Pipe").each(function () {

            if ($(this).offset().left / $(this).parent().width() < -0.2) {
                $(this).remove();
            }
        });
    }

    function checkCollisions() {
        $(".Pipe").each(function () {
            if (isIntersecting(Birdy.BirdyObject, $(this))) {
                console.log("Hit!");
                endGame();
            }
        });
    }

    function isIntersecting(obj1, obj2) {

        var obj1Dimensions = [
            obj1.offset().left,
            obj1.offset().top,
            obj1.offset().left + obj1.width(),
            obj1.offset().top + obj1.height(),
        ];
        var obj2Dimensions = [
            obj2.offset().left,
            obj2.offset().top,
            obj2.offset().left + obj2.width(),
            obj2.offset().top + obj2.height(),
        ];



        return !(
            obj1Dimensions[3] < obj2Dimensions[1] ||
            obj1Dimensions[1] > obj2Dimensions[3] ||
            obj1Dimensions[0] > obj2Dimensions[2] ||
            obj1Dimensions[2] < obj2Dimensions[0]
        );
    }

    function isInBound(birdy, canvas) {


        if (
            birdy.offset().top + birdy.height() >
            canvas.offset().top + canvas.height() ||
            birdy.offset().top < canvas.offset().top
        ) {
            console.log("Out of Bounds!");
            endGame();
        }
    }


    function incrementScore() {
        $(".BottomPipe").each(function () {
            var BirdyBeakXPos =
                Birdy.BirdyObject.offset().left + Birdy.BirdyObject.width();
            var PipeRightXPos = $(this).offset().left + $(this).width();
            if (!$(this).data("scored") && BirdyBeakXPos > PipeRightXPos) {
                CurrentScore++;
                console.log(CurrentScore);
                $(this).data("scored", true);
            }
        });

        $("#CurrentScore").html(CurrentScore);
    }


    startGame();


    jQuery.fn.rotate = function (degrees) {
        return $(this).css({
            "-webkit-transform": "rotate(" + degrees + "deg)",
            "-moz-transform": "rotate(" + degrees + "deg)",
            "-ms-transform": "rotate(" + degrees + "deg)",
            transform: "rotate(" + degrees + "deg)",
        });
    };


    function setCookie(cname, cvalue, exdays) {
        var d = new Date();
        d.setTime(d.getTime() + exdays * 24 * 60 * 60 * 1000);
        var expires = "expires=" + d.toGMTString();
        document.cookie = cname + "=" + cvalue + "; " + expires;
    }
    function getCookie(cname) {
        var name = cname + "=";
        var ca = document.cookie.split(";");
        for (var i = 0; i < ca.length; i++) {
            var c = ca[i].trim();
            if (c.indexOf(name) == 0) return c.substring(name.length, c.length);
        }
        return "";
    }
});