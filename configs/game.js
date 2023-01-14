$(function () {
    $("#InstructionBox").slideDown(); //Slide down the instructions box
    setTimeout(function () {
        $("#InstructionBox").slideUp();
    }, 5000); //Make it slide up after 5 seconds

    var canvasObject = $("#Canvas");

    var gameLoopIntervalID = 0;
    var Paused = true;

    var Lost = false;

    function pauseGame() {
        clearInterval(gameLoopIntervalID); //Stop the timer
        $(".Pipe").addClass("paused"); //Pause the CSS3 animation so the pipes don't move.
        $("#PauseButton span")
            .removeClass("glyphicon-pause")
            .addClass("glyphicon-play"); //Swap out the pause text with the play text
        Paused = true; //Set paused flag to true
    }

    function startGame() {
        if (Lost) {
            return; //Don't unpause if we're already dead
        }
        //Run the gameLoop every 100ms and save the ID for stopping
        gameLoopIntervalID = setInterval(function () {
            gameLoop();
        }, 30);
        $(".Pipe").removeClass("paused"); //Unpause the CSS3 animations
        $("#PauseButton span")
            .removeClass("glyphicon-play")
            .addClass("glyphicon-pause"); //Swap out the play text with the pause text
        Paused = false; //Set pause flag to false
    }

    function endGame() {
        Lost = true; //Set the lost flag to true, so they can't unpause;
        pauseGame(); //"Pause" the game
        var cookieScore = getCookie("HighScore");
        console.log(Math.max(CurrentScore, cookieScore));
        console.log(cookieScore);
        setCookie("HighScore", Math.max(CurrentScore, cookieScore), 30000); //Store the highest score between current score and saved score
        Birdy.BirdyObject.animate({ top: "90%" }, 1500, "linear"); //Drop our birdy
        $("#FinalScore").html(CurrentScore); //Update the current score
        $("#BestScore").html(Math.max(CurrentScore, cookieScore)); //Update the current score
        $("#LostScoreScreen").slideDown(); //Have a nice slideDown for the score screen
    }

    function resetGame() {
        pauseGame(); //Pause the game first, so we'll kill the last game loop
        $(".Pipe").remove(); //Remove all pipes
        Lost = false; //Reset the lost flag
        CurrentScore = 0; //Reset the score
        Birdy.Reset(); //Reset the bird object
        startGame(); //Restart the game loop
        $("#LostScoreScreen").slideUp(); //Have a nice slideUp for the score screen
    }

    //Toggle the pause function
    function togglePause() {
        if (!Paused) {
            pauseGame();
        } else {
            startGame();
        }
    }

    var CurrentScore = 0;

    $("#PauseButton").mousedown(function (event) {
        event.stopPropagation(); //Don't allow the click to register as a "jump" command, by stopping it's propagation through the DOM tree.
        togglePause(); //Toggle the pause.
    });

    $("#ResetButton").click(function () {
        resetGame();
    });

    canvasObject.mousedown(function () {
        Birdy.jump(); //Jump when the user clicks
    });

    $("body").keydown(function (event) {
        console.log(event.which == 49)
        if (event.which == 49) {
            resetGame();
        }
        if (event.which == 50) {
            togglePause()
        }
        if (event.which) {
            Birdy.jump();; //Toggle the pause.
        }
    });

    //Count how many gameLoops have passed
    var gameLoopCounter = 0;

    function gameLoop() {
        if (gameLoopCounter % 2 === 0) {
            //Reduce to every 2 loops to improve performance
            incrementScore();
            checkCollisions();
        }

        isInBound(Birdy.BirdyObject, canvasObject);
        Birdy.fall();

        //TODO: Add decrease time between pipes as score increases
        if (gameLoopCounter % 90 === 0) {
            addPipe(); //Add a pipe every 90 loops ~2.7 seconds
            cleanPipes(); //Remove pipes as well
        }

        if (gameLoopCounter % 7 === 0) {
            //Flap the wings every 7 loops
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

        //Current angle of the bird
        var Angle = 0;

        //Wing flap counter
        var WingPosition = 0;

        //Sequence of the wing flapping
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
                    .animate({ top: "+=" + gravVeloc + "%" }, 30, "linear"); //Stop any current animations and then drop the bird by Velocity%
                gravVeloc += gravAccel; //Add the acceleration scalar to the velocity scalar.
                //Limit the maximum velocity of the bird
                if (gravVeloc > terminalVelocity) {
                    gravVeloc = terminalVelocity;
                }
                var AdjustedAngle =
                    (Angle + 15 * (gravVeloc / terminalVelocity)) ^ 2;
                adjustAngle(Math.min(AdjustedAngle, 90));
                $("#DebugInfo").html("Gravity: " + gravVeloc);
            } else {
                gravVeloc = 0; //Reset the falling velocity.
                //console.log('Grav Disabled');
            }
        };

        this.jump = function () {
            if (Paused) {
                //If we're paused, don't let our bird jump
                return;
            }
            jumping = true; //Set that we're jumping right now
            adjustAngle(-45);
            selectorObject
                .stop()
                .animate({ top: "-=9%" }, 100, "linear", function () {
                    //stop any current animations and "Jump" up 9% in 100ms linearly.
                    jumping = false; //Set our jumping flag to false right after our jump
                    Birdy.fall(); //Run the fall immediately
                });
        };

        this.flapWings = function () {
            WingPosition++; //Increment wing flapping counter

            if (Angle > 45) {
                //If the bird is falling, put the wings back to center
                WingPosition = 1;
            }

            selectorObject.css(
                "background-position-x",
                WingPositions[WingPosition % 4] * 50 + "%"
            ); //Move the backgroud position of the bird to animate the flapping
        };

        function adjustAngle(angle) {
            selectorObject.rotate(angle); //Rotate the bid
            Angle = angle; //Set the current angle of the bird so we can read it
        }

        this.BirdyObject = selectorObject;
    })();

    //Generate a new pipe
    function addPipe() {
        var PipeGap = 30, //Gap between pipes in %
            MinPipeHeight = 5; //Minimum pipe height, so the pipes are still okay sized.

        var MaxTopPipeHeight = 100 - PipeGap - 2 * MinPipeHeight; //Max height the top pipe can be
        var TopPipeHeight = Math.random() * MaxTopPipeHeight + MinPipeHeight; //Actual top pipe height, which is random.
        var BottomPipeTop = TopPipeHeight + PipeGap; //This calculates where the bottom pipe would be in position
        var BottomPipeHeight = 100 - BottomPipeTop; //This calculates how tall the bottom pipe should be

        //Let's create the top pipe, give it the correct height, and add it to the canvas. Mark them as non-scored.
        $("<div/>")
            .addClass("Pipe")
            .css("height", TopPipeHeight + "%")
            .data("scored", false)
            .appendTo(canvasObject);
        //And now the bottom pipe, but this time we need to tell how far from the top it is, and how tall it is as well. Mark them as non-scored.
        $("<div/>")
            .addClass("Pipe BottomPipe")
            .css({ height: BottomPipeHeight + "%", top: BottomPipeTop + "%" })
            .data("scored", false)
            .appendTo(canvasObject);
    }

    //Delete all the pipes that are already off screen
    function cleanPipes() {
        $(".Pipe").each(function () {
            //If the position percentage is less than -20%, it's off the screen
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
        //Get the coordinates of the left, top, right, and bottom of the bird and pipe
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

        /*
         * It's easier to prove that we aren't intersecting, so we'll
         * prove that our bird isn't touching any pipes, and then
         * we'll negate the result to find out if it touching the pipe.
         */

        return !(
            obj1Dimensions[3] < obj2Dimensions[1] || //If our bird's bottom edge is above the pipe's top edge OR
            obj1Dimensions[1] > obj2Dimensions[3] || //If our bird's top edge is below the pipe's bottom edge OR
            obj1Dimensions[0] > obj2Dimensions[2] || //If our bird's left edge is right of the pipe's right edge OR
            obj1Dimensions[2] < obj2Dimensions[0]
        ); //If our bird's right edge is left of the pipe's left edge OR
    }

    function isInBound(birdy, canvas) {
        //We're out of bounds if the bottom of the bird is below the bottom of the canvas
        //OR if the bird's top is above the canvas top
        if (
            birdy.offset().top + birdy.height() >
            canvas.offset().top + canvas.height() ||
            birdy.offset().top < canvas.offset().top
        ) {
            console.log("Out of Bounds!"); //Print out that we're out of bounds
            endGame();
        }
    }

    //Increase the score as the birdy passes a pipe
    function incrementScore() {
        $(".BottomPipe").each(function () {
            var BirdyBeakXPos =
                Birdy.BirdyObject.offset().left + Birdy.BirdyObject.width(); //Calculate the X coordinate of the bird's beak.
            var PipeRightXPos = $(this).offset().left + $(this).width(); //Calculate the X coordinate of the pipe's right edge.
            if (!$(this).data("scored") && BirdyBeakXPos > PipeRightXPos) {
                //If we're ahead of the pipe and we haven't scored on it yet, add to the score.
                CurrentScore++; //Increment score
                console.log(CurrentScore); //Write to console the score we currently have for debugging purposes
                $(this).data("scored", true); //Mark the pipe as scored, so we won't look at it again
            }
        });
        $("#CurrentScore").html(CurrentScore); //Update current score display
    }

    //Run the start game which starts the gameLoop function
    startGame();

    //jQuery function to set the rotation of an element using the CSS3 transform property.
    jQuery.fn.rotate = function (degrees) {
        return $(this).css({
            "-webkit-transform": "rotate(" + degrees + "deg)",
            "-moz-transform": "rotate(" + degrees + "deg)",
            "-ms-transform": "rotate(" + degrees + "deg)",
            transform: "rotate(" + degrees + "deg)",
        });
    };

    /* Set and Get Cookies function from: http://www.w3schools.com/js/js_cookies.asp */
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