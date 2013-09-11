$.fn.textWidth = function () {
    "use strict";
    var html_org = $(this).html();
    var html_calc = '<span>' + html_org + '</span>';
    $(this).html(html_calc);
    var width = $(this).find('span:first').width();
    $(this).html(html_org);
    return width;
};

(function () {
  "use strict"; 
    window.zread = {
        init: function () {
            var self = this;
            self.calcPositioning();
            self.font = "'Cousine', 'Press Start 2P', 'Droid Sans Mono', 'Courier New', Courier, monospace";
            self.speed = 20;
            setInterval(function(){self.displayMarker();}, 100);
        },
        calcPositioning: function()
        {
            this.max_lc = this.getNumLines();
            this.line_lim = this.calcLineLimit(); 
        },
        //cuts the text based on line limitations, outputs into lines array
        chop: function (text, lines) {
            if (text.length <= this.line_lim) {
                if (text.length > 0) {
                    lines.push(_.trim(text));
                }
            } else {
                var pos = this.lastWord(text);
                //new str is just the front (chop off at pos)
                var newline = _(text).splice(pos, text.length);
                lines.push(_.trim(newline));
                //lines.push(newline);
                this.chop(_(text).splice(0, pos), lines);
            }
        },
        //gets the position of the last "word" (anything seperated by whitespace)
        lastWord: function (line) {
            var pos = 0;
            for (var i = 0; i < line.length; i++) {
                var ch = line.charAt(i);
                if ((i <= this.line_lim) && _(ch).isBlank()) {
                    pos = i;
                }
            }
            //if there is no whitespace, truncate the line
            if(pos === 0)
            {
                pos = this.line_lim;
            }
            return pos;
        },
        prepare: function (text) {
            var self = this;
            var split = text.split("\n\n");
            var lines = [];
            for(var i=0; i < split.length; i++)
            {
                //if not last element, add pagebreak
                //page breaks used to separate text into chunks for reading
                if(i-1 !== split.length) { 
                    split[i] += "<br/> ";
                }
                //make sure the newlines have an extra space for readability in html
                split[i] = split[i].replace(/\n/g,"\n ");
                self.chop(split[i], lines);
            }
            if (lines.length > 0) {
                this.blocks = this.blockify(lines);
            }
            if (this.blocks.length > 0) {
                this.pos = 0;
            }
        },
        drawCurtains: function(){
            var self = this;
            if ($('#curtains').length === 0) {
                var overlay = $('<div id="curtains"></div>');
                overlay.appendTo(document.body); 
                overlay.click(function(){
                    self.closeReading();
                });
            }
        },
        closeReading: function()
        {
            this.removeText();
            $('#curtains').remove();
            $('#exit').remove();
            $('#marker').remove();
        },
        removeText: function(){
            var overlay = $('#overlay');
            if (overlay.length !== 0) {
                overlay.remove();
            }
        },
        blitText: function () {
            this.removeText();
            var overlay = $('<div class="overlaycenter" id="overlay">' +
                this.blocks[this.pos] + '</div>');
            overlay.css("font-family", this.font);
            overlay.appendTo(document.body);
            this.addNextPageEvent(overlay);
        },
        drawExit: function (overlay) {
            var self = this;
            if ($('#exit').length === 0) {
                var paddingRight = parseInt(overlay.css("padding-right"), 10);
                var xPos = overlay.offset().left + overlay.width() + paddingRight;
                var yPos = overlay.offset().top - 3;
                var exit = $('<div class="icon" id="exit">×</div>');
                exit.offset({top:yPos, left: xPos});
                exit.appendTo(document.body);
                exit.click(function(){
                    self.closeReading();
                });
            }
        },
        displayMarker: function () {
            var self = this;
            var overlay = $('#overlay');
            //if the overlay is active and finished reading...
            if (overlay.length !== 0){
                if(!self.isReading())
                {
                    if($('#marker').length === 0) {
                        var paddingTop = parseInt(overlay.css("padding-top"), 10);
                        var xPos = overlay.offset().left + overlay.width()/2;
                        var yPos = overlay.offset().top + overlay.height() + paddingTop - 3;
                        var marker;
                        if(self.isLast())
                        {
                            marker = $('<div class="icon" id="marker">■</div>');
                            marker.offset({top:yPos, left: xPos});
                            marker.appendTo(document.body);
                        }
                        else
                        {
                            marker = $('<div class="icon" id="marker">▼</div>');
                            marker.offset({top:yPos, left: xPos});
                            marker.appendTo(document.body);
                            marker.click(function(){
                                self.addNextPageEvent(marker);
                            });
                        }
                    }
                }
                //include this check as a safeguard
                //sometimes the timer will redraw after it is removed
                else
                {
                    var marker = $('#marker');
                    if(marker.length !== 0) { 
                        marker.remove();
                    }
                }
            }
        },
        isLast: function () {
            if(this.pos+1 >= this.blocks.length)
            {
                return true;
            }
            return false;
        },
        readText: function () {
            this.drawCurtains();
            this.removeText();
            var overlay = $('<div class="overlaycenter" id="overlay">' +
                this.blocks[this.pos] + '</div>');
            overlay.attr('data-in-effect', 'fadeIn');
            overlay.attr('data-out-effect', 'fadeOut');
            overlay.attr('data-out-sync', 'true');
            overlay.css("font-family", this.font);
            overlay.appendTo(document.body);
            var self = this;
            self.drawExit(overlay);
            overlay.textillate({ in : {
                    delay: self.speed,
                }
            });
            this.addNextPageEvent(overlay);
        },
        isReading: function (){
            var words = $('#overlay > span:first-child > span');
            for(var i = words.length-1; i>0; i--){
                if(words[i].children.length !== 0) {
                    var last = words[i].children.length-1;
                    var last_char = $(words[i].children[last]);
                    if(_.str.include(last_char.attr("class"), "char"))
                    {
                        if(last_char.css("visibility") === "hidden")
                        {
                            return true;
                        }
                        return false;
                    }
                }
            }
            return false;
        },
        addNextPageEvent: function(overlay) {
            var self = this;
            overlay.click(function(){
                if(self.isReading())
                { 
                    self.blitText();
                }
                else
                {
                    self.pos++;
                    if(self.pos < self.blocks.length) {
                        self.readText();
                    }
                    var marker = $('#marker');
                    if(marker.length !== 0) { 
                        marker.remove();
                    }
                }
            });
        },
        //get the number of lines that can be displayed in the css class 'overlay'
        getNumLines: function () {
            //var elem = $('<div class="overlay hidden"></div>');
            var elem = $('<div class="overlaycenter hidden"></div>');
            elem.css("font-family", this.font);
            elem.appendTo(document.body);
            var h = elem.height();
            //convert pixels to base 10
            var lh = parseInt(elem.css('line-height'), 10);
            if (!lh) {
                lh = 18;
            }
            elem.remove();
            return Math.floor(h / lh);
        },
        //Gets the limit of a div based on a sample word repeated
        //Only works with fixed space fonts
        calcLineLimit: function () {
            //get width of element that houses text
            //var elem = $('<div class="overlay hidden"></div>');
            var elem = $('<div class="overlaycenter hidden"></div>');
            elem.css("font-family", this.font);
            elem.appendTo(document.body);
            var w = elem.width();
            elem.remove();
            //get width of a single char, assumes monospace font
            var elem2 = $('<span class="font-test hidden">X</div>');
            elem2.css("font-family", this.font);
            elem2.appendTo(document.body);
            var lw = elem2.width();
            this.fontWidth = lw;
            elem2.remove();
            return Math.floor(w / lw);
        },
        //Failed method for non-monospace font
        /*calcLineLimit: function () {
            var prev = 0;
            var elem = $('<div class="overlay hidden"></div>');
            elem.appendTo(document.body);
            var MAX_LINE = 1000;
            var WORD = 'Words '; 
            for (var i = 0; i < MAX_LINE; i++) {
                elem.append(WORD);
                //If it is the same as the last, it means the text has wrapped
                if (elem.textWidth() === prev) {
                    elem.remove();
                    return i*WORD.length;
                }
                prev = elem.textWidth();
            }
            elem.remove();
            return null;
        },*/
        //translate the lines into blocks to be blitted out to the screen
        blockify: function (lines) {
            var lc = 0;
            var blocks = [];
            var block = "";
            for (var i = 0; i < lines.length; i++) {
                if(_.str.include(lines[i], "<br/>")){
                    lines[i].replace("<br/>", " ");
                    block += lines[i];
                    blocks.push(block);
                    block = "";
                    lc = 0;
                    continue;
                }
                if(lc < this.max_lc) {
                    block += lines[i] + " ";
                    lc++;
                } 
                else{
                    blocks.push(block);
                    block = lines[i] + " ";
                    lc = 0;
                }
            }
            if (block.length !== 0) {
                blocks.push(block);
            }
            return blocks;
        },
    };
})();

$(document).ready(function () {
    "use strict";
    _.mixin(_.string.exports());
    window.zread.init();
    $("#fontselect").change(function() {
        var zread = window.zread;
        zread.font = "'"+$(this).val()+"'";
        zread.calcPositioning();
    });
    $("#speed").change(function() {
        window.zread.speed = $(this).val();
    });
});

