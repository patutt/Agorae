(function($) {
  function Session() {
    this.login = function(){
      $.showDialog("dialog/_login.html", {
        modal: true,
        load: function(dialog){
          //Load default setting from cookie
          var name = $.cookie('name') || '';
          var password = $.cookie('password') || '';
          var cookie = $.cookie('cookie') || '0';

          $(dialog).find('input[name="name"]').val(name).focus(function(){ $(this).select(); });
          $(dialog).find('input[name="password"]').val(password);
          if(cookie == '1')
            $(dialog).find('input[name="cookie"]').attr('checked', true);
          else
            $(dialog).find('input[name="cookie"]').removeAttr('checked');
        },
        submit: function(data, callback) {
          if (!data.name || data.name.length == 0) {
            callback({name: "Please enter a name."});
            return false;
          };
          if (!data.password || data.password.length == 0) {
            callback({password: "Please enter a password."});
            return false;
          };
          $.agorae.login(data.name, data.password, callback, function(){
            if(data.cookie){
              $.cookie('cookie', '1', { expires: 365});
              $.cookie('name', data.name, { expires: 365});
              $.cookie('password', data.password, { expires: 365});
            }
            else
            {
              $.cookie('cookie', '0');
              $.cookie('name', null);
              $.cookie('password', null);
            }
            $.agorae.session.username = data.name;
            $.agorae.session.password = data.password;
            $('span.sign-in').hide().next().show();
            $('span.item-search').show();
            $('#index-edit-toggle').show();
            $.agorae.pagehelper.route();
          });
        }
      });
      return false;
    };

    this.logout = function(){
      $.cookie('session.username', null);
      $('span.sign-in').show().next().hide();
      $('span.item-search').hide();
      $.agorae.pagehelper.hideController();
    };
  }
  function PageHelper(){
    this.init = function(config){
      //resize main layer size
      $(window).resize(resizeSidebar).trigger('resize');
      setTimeout('$.agorae.pagehelper.resize();', 300);

      //Load configuration from CouchDB document
      if(!$.cookie('config') && typeof config == "string")
        $.agorae.loadConfig(config);
      else
      {
        //If configuration is written into script
        if(!$.cookie('config') && typeof config == "object")
          $.agorae.config = config;
      }

      //Personalize header and footer
      if($.agorae.config.header)
        $('div#header').html($.agorae.config.header);
      if($.agorae.config.footer)
        $('div#footer').html($.agorae.config.footer);

      //init topic tree dialog
      $.agorae.topictree.init();
      //init item search dialog
      $.agorae.itemdialog.init();
      //init event;
      $('a#item-search').click(function(){ $.agorae.itemdialog.open( shortcutToItem );  return false;});
      $('a#sign-in').click($.agorae.session.login);
      $('a#sign-out').click($.agorae.session.logout);
      $('a#shortcut').click(function(){ $.agorae.topictree.openDialog( shortcutToTopic );  return false;});

      $.agorae.session.ctrlPressed = false;
      $(window).keydown(function(evt) {
        if (evt.which == 17) { // ctrl
          $.agorae.session.ctrlPressed = true;
        }
      }).keyup(function(evt) {
        if (evt.which == 17) { // ctrl
          $.agorae.session.ctrlPressed = false;
        }
      });

      $(window).hashchange($.agorae.pagehelper.route).hashchange();
    };
    this.route = function(){
      var uri = $.getUri();
      if(!uri)
      {
        $('div#main').attr('class', 'index');
        $.showPage('page/_index.html', $.agorae.indexpage.init);
        return false;
      }

      if(uri.indexOf('/viewpoint/') > 0)
      {
        $('div#main').attr('class', 'viewpoint');
        $.showPage('page/_viewpoint.html', $.agorae.viewpointpage.init);
        return false;
      }
      if(uri.indexOf('/topic/') > 0)
      {
        $('div#main').attr('class', 'topic');
        $.showPage('page/_topic.html', $.agorae.topicpage.init);
        return false;
      }
      if(uri.indexOf('/item/') > 0)
      {
        $('div#main').attr('class', 'item');
        $.showPage('page/_item.html', $.agorae.itempage.init);
        return false;
      }
    };
    this.rewrite = function(url){
      self.location.hash = url;
    };
    this.toggle = function(show, clickon, clickoff){
      if(typeof $.agorae.session.username == "undefined" || show !== true){
        $('input#index-edit-toggle').hide();
        return false;
      }
      $('input#index-edit-toggle').show().iToggle({
      	easing: 'easeOutExpo',
      	type: 'radio',
      	keepLabel: true,
      	easing: 'easeInExpo',
      	speed: 300,
      	onClickOn: function(){
      	  if(clickon) clickon();
      		$('.ctl').show();
      		$('ul.links').addClass('editing').removeClass('links');
      	},
      	onClickOff: function(){
      	  if(clickoff) clickoff();
      	  $('.ctl').hide();
      	  $('ul.editing').addClass('links').removeClass('editing');
      	}
      });
    };
    this.checkController = function(){
      if($('#index-edit-toggle').attr('checked'))
        $('.ctl').show();
      else
        $('.ctl').hide();
    };
    this.hideController = function(){
      $('#index-edit-toggle').removeAttr('checked').hide().parent().hide();
      $('.ctl').hide();
    };
    this.navigatorBar = function(obj){
      if(typeof(obj) != 'string'){
        var str = '';
        for(var i=0, bar; bar = obj[i]; i++)
        {
          if(bar.uri)
            str += '<a href="' + bar.uri + '">' + bar.name + '</a>';
          else
            str += '<b>' + bar.name + '</b>';

          if(i < obj.length-1)
            str += ' &gt; ';
        }
        obj = str;
      }
      $('div#header-navigatorbar').html(obj);

    };
    this.resize = function(){ resizeSidebar(); };
    function resizeSidebar(){
      var viewportHeight = window.innerHeight ? window.innerHeight : $(window).height();
		  viewportHeight = viewportHeight - 169;
		  viewportHeight = (viewportHeight > 0) ? viewportHeight : 0;
		  viewportHeight = (viewportHeight < $('div#main').outerHeight()) ? $('div#main').outerHeight() : viewportHeight;
		  $('div#sidebar').height(viewportHeight);
    };
    function shortcutToTopic(){
      var uris = [];
      if($('#tt-tree').attr('checked'))
        for(var i=0, t; t = $.jstree._focused().data.ui.selected[i]; i++)
          uris.push($(t).attr("uri"));
      else
        for(var j=0, el; el = $('#tags a.tag-clicked')[j]; j++)
        {
          var el = $(el).parent();
          if(!el.attr("topics")) continue;
          var tag_topics = JSON.parse(el.attr("topics"));
          for(var k=0, t; t = tag_topics[k]; k++)
             uris.push(t.uri);
        }
      $.agorae.topictree.closeDialog();
      if(uris.length == 0) return;
      if(uris.length == 1)
        $.agorae.pagehelper.rewrite(uris[0]);
      else
        for(var i=0, uri; uri = uris[i]; i++)
          if(i == 0)
            $.agorae.pagehelper.rewrite(uris[i]);
          else
            window.open(uris[i]);
    };
    function shortcutToItem(){

    };
  }
  function IndexPage(){
    this.init = function(){
      if(!$.agorae.config.servers)
      {
        $.showMessage({title: "Erreur", content: "Une erreur de configuration a été détecté! Aucun Hypertopic service trouvé."});
        return false;
      }
      if($.agorae.config.items)
        $.each($.agorae.config.items, appendItem);
      if($.agorae.config.viewpoints)
        $.each($.agorae.config.viewpoints, appendViewpoint);
      if($.agorae.session.username)
        $.each($.agorae.config.servers, appendUser);

      $.agorae.pagehelper.toggle(true);
      $.agorae.pagehelper.navigatorBar('<b>Accueil</b>');

      //Enable the links
      $('div.index ul#item li[uri] span').die().live('click', onItemClick);
    	$('div.index div.viewpoint-list img.add').click(createViewpoint);
    	$('div.index ul#viewpoint img.del').die().live('click', deleteViewpoint);
    	$('div.index ul#viewpoint li[uri] span').die().live('click', onViewpointClick);
    }
    function appendItem(idx, itemUrl){
      $.agorae.getItem(itemUrl, function(item){
        if(!item) return false;
        var el = $('<li><span>' + item.name + '</span></li>').attr("id", item.id).attr("corpus", item.corpus)
                  .attr("uri", itemUrl);
        $('ul#item').append(el);
      });
    };
    function appendViewpoint(idx, viewpointUrl, viewpoint, editable){
      if(!viewpoint)
        $.agorae.getViewpoint(viewpointUrl, function(viewpoint){
          var el = $('<li><span>' + viewpoint.name + '</span></li>')
                    .attr("id", viewpoint.id).data("viewpoint", viewpoint)
                    .attr('uri', viewpointUrl);
          $('ul#viewpoint').append(el);
        });
      else
      {
        var el = $('<li><span>' + viewpoint.name + '</span></li>')
                    .attr("id", viewpoint.id).data("viewpoint", viewpoint)
                    .attr('uri', viewpointUrl);
        if(editable)
          el.find('span').addClass('editable');
        $('ul#viewpoint').append(el);
      }
    };
    function appendUser(index, server){
      $.agorae.getUser(server, function(user){
        if(user.viewpoint)
          for(var i=0, viewpoint; viewpoint = user.viewpoint[i]; i++){
            appendViewpoint(i, server + 'viewpoint/' + viewpoint.id, viewpoint, true);
          }
      });
    };
    function onItemClick(){
      var uri = $(this).parent().attr("uri");
      $.agorae.pagehelper.rewrite(uri);
      return false;
    };
    function createViewpoint(){
      $.agorae.createViewpoint('Sans nom', function(doc){
        appendViewpoint(0, $.agorae.config.servers[0] + doc.id, doc);
        $.agorae.pagehelper.checkController();
      });
    };
    function deleteViewpoint(){
      var uri = $(this).parent().attr('uri');
      var self = $(this);
      $.agorae.deleteDoc(uri, function(){
        self.parent().remove();
      });
    };
    function onViewpointClick(){
      if(!$('#index-edit-toggle').attr('checked'))
      {
        var uri = $(this).parent().attr('uri');
        $.agorae.pagehelper.rewrite(uri);
        return false;
      }
      if(!$(this).hasClass('editable'))
        return false;
      var viewpointName = $(this).text();
      var el = $('<input type="textbox">').val(viewpointName);
    	$(this).replaceWith(el);
    	el.focus(function() { $(this).select(); }).select()
    	  .mouseup(function(e){ e.preventDefault(); });
    	el.blur(function(){
    	  var span = $('<span></span>').addClass('editable');
    	  if($(this).val() == '' || $(this).val() == viewpointName)
    	  {
    	    span.html(viewpointName);
    	    $(this).replaceWith(span);
    	  }
    	  else
    	  {
    	    var self = $(this);
    	    var newName = self.val();
      	  var uri = $(this).parent().attr("uri");
    	    $.agorae.renameViewpoint(uri, newName, function(){
    	      span.html(newName);
    	      self.replaceWith(span);
    	    }, function(){
    	      span.html(viewpointName);
    	      self.replaceWith(span);
    	    });
    	  }
    	});
    	el.keyup(function(event){
        if (event.keyCode == 27 || event.keyCode == 13)
          $(this).blur();
      });
      return false;
    };
  }
  function ViewpointPage(){
    this.init = function(){
      var uri = $.getUri();
      $.agorae.getViewpoint(uri, function(viewpoint){
        var bars = [{'uri': '#', 'name': 'Accueil'}];
        bars.push({'name': viewpoint.name + ''});
        $.agorae.pagehelper.navigatorBar(bars);
        if(viewpoint.upper)
          $.each(viewpoint.upper, appendTopic);
      });

      if(typeof($.agorae.config.servers[0]) == "string" && uri.indexOf($.agorae.config.servers[0]) == 0)
        $.agorae.pagehelper.toggle(true);
      else
        $.agorae.pagehelper.toggle(false);
      $('div.viewpoint div.topic-list img.add').click(createTopic);
    	$('div.viewpoint div.topic-list img.del').die().live('click', $.agorae.viewpointpage.deleteTopic);
    	$('div.viewpoint ul#topic li[uri] span').die().live('click', $.agorae.viewpointpage.onTopicClick);
    };
    function createTopic(){
      var uri = $.getUri();
      $.agorae.createTopic(uri, 'sans nom', function(doc){
        appendTopic(0, doc);
        $.agorae.pagehelper.checkController();
      });
    };
    this.deleteTopic = function(){
      var id = $(this).parent().attr('id');
      var uri = $(this).parent().attr('uri');
    	var self = $(this);
    	$.agorae.deleteTopic(uri, id , function(){
    	  self.parent().remove();
    	});
    };
    function appendTopic(index, topic){
      var uri = $.getUri();
      uri += '/' + topic.id;
      uri = uri.replace(/\/viewpoint\//, "/topic/");
      var el = $('<li><img class="del ctl hide" src="css/blitzer/images/delete.png">'
                   + '<span class="editable">' + topic.name + '</span></li>')
                   .attr("id", topic.id).attr("uri", uri);
      $('ul#topic').append(el);
    };
    this.onTopicClick = function(){
      var uri = $(this).parent().attr('uri');
      if(!$('#index-edit-toggle').attr('checked'))
      {
        $.agorae.pagehelper.rewrite(uri);
        return false;
      }
      var id = $(this).parent().attr('id');
      var name = $(this).text();
      var el = $('<input type="textbox">').val(name);
    	$(this).replaceWith(el);
    	el.focus(function() { $(this).select(); }).select()
    	  .mouseup(function(e){ e.preventDefault(); });
    	el.blur(function(){
    	  var span = $('<span></span>').addClass('editable');
    	  if($(this).val() == '' || $(this).val() == name)
    	  {
    	    span.html(name);
    	    $(this).replaceWith(span);
    	  }
    	  else
    	  {
    	    var self = $(this);
    	    var newName = self.val();
    	    $.agorae.renameTopic(uri, id, newName, function(){
    	      span.html(newName);
    	      self.replaceWith(span);
    	    }, function(){
    	      span.html(name);
    	      self.replaceWith(span);
    	    });
    	  }
    	});
    	el.keyup(function(event){
        if (event.keyCode == 27 || event.keyCode == 13)
          $(this).blur();
      });
      return true;
    };
  }
  function TopicPage(){
    this.init = function(){
      var uri = $.getUri();

      $.agorae.getTopic(uri, function(topic){
        var bars = [{'uri': '#', 'name': 'Accueil'}];
        bars.push({'uri': '#' + topic.viewpointUrl, 'name': topic.viewpoint_name});
        if(topic.broader)
          for(var i=0, t; t = topic.broader[i]; i++)
            bars.push({'uri': '#' + topic.prefixUrl + t.id, 'name': t.name});
        bars.push({'name': topic.name});

        $.agorae.pagehelper.navigatorBar(bars);
        if(topic.narrower)
          $.each(topic.narrower, appendTopic);
        if(topic.item)
          $.each(topic.item, appendItem);
      });

      if(typeof($.agorae.config.servers[0]) == "string" && uri.indexOf($.agorae.config.servers[0]) == 0)
        $.agorae.pagehelper.toggle(true);
      else
        $.agorae.pagehelper.toggle(false);

      $('div.topic div.topic-list img.add').click(createTopic);
      $('div.topic div.topic-list img.del').die().live('click', $.agorae.viewpointpage.deleteTopic);
      $('div.topic div.topic-list img.unlink').die().live('click', unlinkTopic);
    	$('div.topic ul#topic li[uri] span').die().live('click', $.agorae.viewpointpage.onTopicClick);
      $('div.topic div.topic-list img.attach').click(attachTopic);

      $('div.topic div.item-list img.add').click(createItem);
      $('div.topic div.item-list img.del').die().live('click', deleteItem);
    	$('div.topic div.item-list img.unlink').die().live('click', unlinkItem);
      $('div.topic ul#item span.editable').die().live('click', onItemClick);
    };
    function createTopic(){
      var uri = $.getUri();
      $.agorae.createTopic(uri, 'Sans nom', function(topic){
        var parts = uri.split("/");
        parts.pop();
        parts.push(topic.id);
        topic.uri = parts.join('/');
        appendTopic(0, topic);
        $.agorae.pagehelper.checkController();
      });
      return false;
    };
    function unlinkTopic(){
      var id = $(this).parent().attr('id');
      var uri = $(this).parent().attr('uri');
      var self = $(this);
      $.agorae.unlinkTopic(uri, id , function(){
        self.parent().remove();
      });
      return false;
    };
    function attachTopic(){
      $.agorae.topictree.openDialog(
        function(){
          var topics = [];
          if($('#tt-tree').attr('checked'))
            for(var i=0, t; t = $.jstree._focused().data.ui.selected[i]; i++)
            {
              if($(t).attr("rel") == "viewpoint") continue;
              topics.push({"id": $(t).attr("topicID"), "viewpoint": $(t).attr("viewpointID"), "name": $(t).attr("name"), "uri": $(t).attr("uri")});
            }
          else
          {
            for(var j=0, el; el = $('#tags a.tag-clicked')[j]; j++)
            {

              var el = $(el).parent();
              if(!el.attr("topics")) continue;
              var tag_topics = JSON.parse(el.attr("topics"));
              var topicName = el.attr("name");
              for(var k=0, t; t = tag_topics[k]; k++)
                topics.push({"id": t.topicID, "viewpoint": t.viewpointID, "name": topicName, "uri": t.uri});
            }
          }
          if(topics.length == 0)
          {
            $.showMessage({title: "Warn", content: "Please select a topic first!"});
            return false;
          }
          var uri = $.getUri();
          $.agorae.moveTopicIn(uri, topics, function(inserts){
            $.each(inserts, appendTopic);
            $.agorae.topictree.closeDialog();
            $.agorae.pagehelper.checkController();
          });
        }
      );
    };
    function appendTopic(idx, topic){
      if(!topic.uri){
        var uri = $.getUri();
        parts = uri.split("/");
        parts.pop();
        parts.push(topic.id);
        topic.uri = parts.join("/");
      }
      var el = $('<li><img class="del ctl hide" src="css/blitzer/images/delete.png">'
                   + '<img class="unlink ctl hide" src="css/blitzer/images/unlink.png">'
                   + '<span class="editable">' + topic.name + '</span></li>')
                   .attr("id", topic.id).attr("uri", topic.uri);
      $('ul#topic').append(el);
    };
    function createItem(){
      var uri = $.getUri();
      $.agorae.createItem(uri, 'Sans nom', function(item){
        appendItem(0, item);
        $.agorae.pagehelper.checkController();
      });
      return false;
    };
    function deleteItem(){
      var itemID = $(this).parent().attr('id');
    	var self = $(this);
    	var prefixUrl;
    	var uri = $.getUri();
      if(uri.indexOf("/topic/") > 0)
        prefixUrl = uri.substr(0, uri.indexOf("topic/"));
    	$.agorae.deleteDoc(prefixUrl + itemID, function(){
    	  self.parent().remove();
    	});
    	return false;
    };
    function unlinkItem(){
      var uri = $.getUri();
      var itemID = $(this).parent().attr('id');
    	var self = $(this);
    	$.agorae.unlinkItem(uri, itemID , function(){
    	  self.parent().remove();
    	});
      return false;
    };
    function appendItem(idx, item){
      var el = $('<li><img class="del ctl hide" src="css/blitzer/images/delete.png">'
                   + '<img class="unlink ctl hide" src="css/blitzer/images/unlink.png">'
                   + '<span class="editable">' + item.name + '</span></li>')
                   .attr("id", item.id).attr("corpus", item.corpus);
      $('ul#item').append(el);
    };
    function onItemClick(){
      var uri = $.getUri(),
          prefixUrl = $.agorae.getServerUri(uri),
          corpusID = $(this).parent().attr('corpus'),
          itemID = $(this).parent().attr('id');
      if(!$('#index-edit-toggle').attr('checked'))
      {
        var uri = prefixUrl + 'item/' + corpusID + '/' + itemID;
        $.agorae.getItem(uri, null, function(){
          $.agorae.pagehelper.rewrite(uri);
        }, function(){
          if($.agorae.session.servers)
          for(var i=0, server; server = $.agorae.session.servers[i]; i++)
          {
            if(server == prefixUrl) continue;
            uri = server + 'item/' + corpusID + '/' + itemID;
            $.agorae.getItem(uri, function(){
                $.agorae.pagehelper.rewrite(uri);
              }, function(){ return false; });
          }
        });
        return false;
      }
      var name = $(this).text();
      var el = $('<input type="textbox">').val(name);
    	$(this).replaceWith(el);
    	el.focus(function() { $(this).select(); }).select()
    	  .mouseup(function(e){ e.preventDefault(); });
    	el.blur(function(){
    	  var span = $('<span></span>').addClass('editable');
    	  if($(this).val() == '' || $(this).val() == name)
    	  {
    	    span.html(name);
    	    $(this).replaceWith(span);
    	  }
    	  else
    	  {
    	    var self = $(this);
    	    var newName = self.val();
    	    $.agorae.renameItem(prefixUrl, itemID, newName, function(){
    	      span.html(newName);
    	      self.replaceWith(span);
    	    }, function(){
    	      span.html(name);
    	      self.replaceWith(span);
    	    });
    	  }
    	});
    	el.keyup(function(event){
        if (event.keyCode == 27 || event.keyCode == 13)
          $(this).blur();
      });
      return true;
    };
  }
  function ItemPage(){
    this.init = function(){
      var uri = $.getUri();
      $.agorae.getItem(uri, function(item){
        $.log(item);
        var bars = [{'uri': '#', 'name': 'Accueil'}];
        bars.push({'name': item.name + ''});
        $.agorae.pagehelper.navigatorBar(bars);
        var reserved = ["corpus", "id", "highlight", "name", "resource", "topic", "_attachments"];
        for(var n in item){
          if(reserved.indexOf(n) >= 0) continue;
          appendAttribute(n, item[n]);
        }
        onEditOff();
        if(item.resource)
        {
          var resource = (item.resource[0] && typeof(item.resource[0]) == "object") ? item.resource[0] : item.resource;
          $.each(resource, appendResource);
        }
        if(item._attachments)
          appendAttachment(item._attachments[0]);
        if(item.topic)
          $.each(item.topic, appendTopic);
      });

      if(uri.indexOf($.agorae.config.servers[0]) == 0)
        $.agorae.pagehelper.toggle(true, onEditOn, onEditOff);
      else
        $.agorae.pagehelper.toggle(false, onEditOn, onEditOff);

      $('div.item div.resource-list img.upload').bind('click', uploadAttachment);
      $('div.item div.resource-list img.del').bind('click', deleteAttachment);
      $('div.item div.resource-list span.attachment').die().live('click', clickAttachment);
      $('div.item div.resource-list img.add').bind('click', attachResource);
      $('div.item div.resource-list span.resource').die().live('click', clickResource);
      $('div.item div.topic-list img.attach').click(attachTopic);
      $('div.item div.topic-list ul#topic img.unlink').click(detachTopic);

      $('div.item div.attribute-list img.add').click(addAttribute);
      $('div.item div.attribute-list img.del').die().live('click', deleteAttribute);

      $('div.item ul#topic li[uri] span').die().live('click', $.agorae.viewpointpage.onTopicClick);
    };
    function onEditOn(){
      var attributes = {};
      $('div.attribute').each(function(){
        var name = $(this).find(".attributename").text();
        attributes[name] = [];
        $(this).find(".attributevalue span").each(function(){
          attributes[name].push($(this).attr("attributevalue"));
        });
      });
      $('ul#attribute').html('');
      for(var name in attributes)
        appendAttribute(name, attributes[name]);
      $('div.attributes').hide();
      $('ul#attribute').show();
    };
    function onEditOff(){
      var attributes = {};
      $('ul#attribute li').each(function(){
        var name = $(this).attr("attributename");
        if(!(name in attributes)) attributes[name] = [];
        attributes[name].push($(this).attr("attributevalue"));
      });
      var str = '';
      for(var name in attributes){
        str += '<div class="attribute">';
        str += '<div style="display: inline;" class="attributename" attributename="' + encodeURIComponent(name) +'">' + name + '</div>';
        str += '<div style="display: inline;" class="attributevalue">';
        for(var i=0, v; v = attributes[name][i]; i++)
        {
          var comma = (i < attributes[name].length - 1) ? "," : "";
          str += '<span attributevalue="' + encodeURIComponent(v) +'">' + v + comma + '</span>';
        }
        str += '</div></div>';
      }
      $('div.attributes').html('').append(str).show();
      $('ul#attribute').hide();
    };
    function parseUri(){
      var uri = $.getUri();
      if(uri.substr(-1) == '/')
        uri = uri.substr(0,uri.length -1);
      parts = uri.split('/');
      var result = {};
      result.item = parts.pop();
      result.corpus = parts.pop();
      parts.pop();
      result.prefixUrl = parts.join('/') + "/";
      result.itemUrl = result.prefixUrl + result.item;
      return result;
    };
    function addAttribute(){
      $.showDialog("dialog/_attribute.html", {
        submit: function(data, callback) {
          if (!data.attributename || data.attributename.length == 0) {
            callback({attributename: "Veuillez saisir le nom d'attribut"});
            return;
          }
          if (!data.attributevalue || data.attributevalue.length == 0) {
            callback({attributename: "Veuillez saisir le valeur d'attribut"});
            return;
          }
          uri = $.getUri();
          $.agorae.describeItem(uri, data.attributename, data.attributevalue, appendAttribute);
          callback();
          $.agorae.pagehelper.checkController();
        }
      });
    };
    function deleteAttribute(){
      $.log('delete');
      var attributename = $(this).parent().attr("attributename");
      var attributevalue = $(this).parent().attr("attributevalue");
      var uri = $.getUri();
      $.log(uri);
      var self = $(this);
      $.agorae.undescribeItem(uri, attributename, attributevalue, function(){
        self.parent().remove();
      });
    };
    function appendAttribute(name, value){
      value = (typeof(value[0]) == "string") ? value : value[0];
      for(var i=0, v; v = value[i]; i++)
      {
        var el = $('<li><img class="del ctl hide" src="css/blitzer/images/delete.png">'
                     + '<span class="editable attributename">' + name + '</span>'
                     + ' : <span class="editable attributevalue">' + v + '</span></li>')
                     .attr("attributename", name).attr("attributevalue", v);
        $('ul#attribute').append(el);
      }
    };
    function uploadAttachment() {
      $.showDialog("dialog/_upload.html", {
        load: function(elem) {
        },
        submit: function(data, callback) {
          if (!data._attachments || data._attachments.length == 0) {
            callback({_attachments: "Please select a file to upload."});
            return;
          }
          var form = $("#upload-form");
          form.find("#progress").css("visibility", "visible");
          var uris = parseUri();
          var itemUrl = uris.prefixUrl + uris.item;
          $.log(itemUrl);
          $.agorae.getItem(itemUrl, null, function(doc){
            $.log(doc);
            $("input[name='_rev']", form).val(doc._rev);
            form.ajaxSubmit({
              url: itemUrl,
              success: function(resp) {
                var uri = $.getUri();
                $.agorae.getItem(uri, function(item){
                  if(item._attachments){
                    $('ul#resource li[file]').remove();
                    appendAttachment(item._attachments[0]);
                  }
                });
                form.find("#progress").css("visibility", "hidden");
                callback();
                $.agorae.pagehelper.checkController();
              }
            });
          });
        }
      });
    };
    function deleteAttachment(){
      var file = $(this).parent().attr("file");
      var uris = parseUri();
      var self = $(this);
      $.agorae.deleteItemAttachment(uris.itemUrl, file, function(){
        self.parent().remove();
      });
    };
    function clickAttachment(){
      var uris = parseUri();
      var url = uris.itemUrl + "/" + $(this).parent().attr("file");
      window.open(url);
    };
    function attachResource(){
      $.showDialog("dialog/_resource.html", {
        submit: function(data, callback) {
          if (!data.resource || data.resource.length == 0) {
            callback({resource: "Please input a resource URL."});
            return;
          }
          var form = $("#resource-form");
          var uris = parseUri();
          var itemUrl = uris.itemUrl;
          $.agorae.attachItemResource(itemUrl, data.resource, function(){
            appendResource(0, data.resource);
            callback();
            $.agorae.pagehelper.checkController();
          });
        }
      });
    };
    function clickResource(){
      var url = $(this).parent().attr("rel");
      if(!$('#index-edit-toggle').attr('checked'))
      {
        window.open(url);
        return false;
      }
      $(this).parent().attr("file", $(this).html());
      var el = $('<input type="textbox">').val(url);
    	$(this).replaceWith(el);
    	el.focus(function() { $(this).select(); }).select()
    	  .mouseup(function(e){ e.preventDefault(); });
    	el.blur(function(){
    	  var span = $('<span></span>').addClass('editable').addClass('resource');
    	  if($(this).val() == '' || $(this).val() == url)
    	  {

    	    span.html($(this).parent().attr("file"));
    	    $(this).replaceWith(span);
    	  }
    	  else
    	  {
    	    var self = $(this);
    	    var newUrl = self.val();
    	    var uris = parseUri();
    	    $.agorae.updateItemResource(uris.itemUrl, url, newUrl, function(){
    	      var urlPath = $.url.setUrl(newUrl).attr("path");
            var file = newUrl;
            if(urlPath && urlPath.indexOf("/") >= 0)
            {
              var parts = urlPath.split("/");
              file = parts.pop();
              if(file == "") file = parts.pop();
            }
    	      span.html(file);
    	      self.replaceWith(span);
    	    }, function(){
    	      span.html($(this).parent().attr("file"));
    	      self.replaceWith(span);
    	    });
    	  }
    	});
    	el.keyup(function(event){
        if (event.keyCode == 27 || event.keyCode == 13)
          $(this).blur();
      });
    };
    function appendResource(idx, url){
      $.log(url);
      var urlPath = $.url.setUrl(url).attr("path");
      var file = url;
      if(urlPath && urlPath.indexOf("/") >= 0)
      {
        var parts = urlPath.split("/");
        file = parts.pop();
        if(file == "") file = parts.pop();
      }
      var el = $('<li><img class="unlink ctl hide" src="css/blitzer/images/unlink.png">'
                   + '<span class="editable resource">' + file + '</span></li>')
                   .attr("rel", url);
      $('ul#resource').append(el);
    };
    function appendAttachment(attachments){
      var uris = parseUri();
      for(var file in attachments)
      {
        var uri = uris.itemUrl + "/" + file;
        var contentType = attachments[file].content_type;
        var fancybox_group = (contentType.indexOf("image/") == 0) ? "fancybox_group" : "";
        var el = $('<li><img class="del ctl hide" src="css/blitzer/images/delete.png">'
                     + '<a rel="' + fancybox_group + '" class="editable attachment" href="' + uri + '">' + file + '</a></li>')
                     .attr("file", file);
        $('ul#resource').append(el);
      }
      fbox();
    };
    function fbox(){
      $("a[rel=fancybox_group]").fancybox({
				'transitionIn'		: 'none',
				'transitionOut'		: 'none',
				'titlePosition' 	: 'over',
				'titleFormat'		: function(title, currentArray, currentIndex, currentOpts) {
					return '<span id="fancybox-title-over">Image ' + (currentIndex + 1) + ' / ' + currentArray.length + (title.length ? ' &nbsp; ' + title : '') + '</span>';
				}
			});
		}
    function attachTopic(){
      $.agorae.topictree.openDialog(
        function(){
          var topics = [];
          if($('#tt-tree').attr('checked'))
            for(var i=0, t; t = $.jstree._focused().data.ui.selected[i]; i++)
            {
              if($(t).attr("rel") == "viewpoint") continue;
              topics.push({"id": $(t).attr("topicID"), "viewpoint": $(t).attr("viewpointID"), "name": $(t).attr("name"), "uri": $(t).attr("uri")});
            }
          else
          {
            for(var j=0, el; el = $('#tags a.tag-clicked')[j]; j++)
            {

              var el = $(el).parent();
              if(!el.attr("topics")) continue;
              var tag_topics = JSON.parse(el.attr("topics"));
              var topicName = el.attr("name");
              for(var k=0, t; t = tag_topics[k]; k++)
                topics.push({"id": t.topicID, "viewpoint": t.viewpointID, "name": topicName, "uri": t.uri});
            }
          }
          if(topics.length == 0)
          {
            $.showMessage({title: "Warn", content: "Please select a topic first!"});
            return false;
          }
          var uri = $.getUri();
          uri = $.agorae.getDocumentUri(uri);
          $.agorae.tagItem(uri, topics, function(){
            $.agorae.topictree.closeDialog();
            $.each(topics, appendTopic);
            $.agorae.pagehelper.checkController();
          });
        }
      );
    };
    function detachTopic(){
      var id = $(this).parent().attr("id");
      var itemUrl = $.getUri();
      $.agorae.untagItem(itemUrl, id, function(){
        $('div.item div.topic-list ul#topic li[id="' + id + '"]').hide().remove();
      });
    };
    function appendTopic(idx, topic){
      if(!topic.name)
      {
        var ret = $.agorae.getTopicName(topic.id, topic.viewpoint);
        $.extend(topic, ret);
      }
      var el = $('<li><img class="unlink ctl hide" src="css/blitzer/images/unlink.png">'
               + '<span class="editable">' + topic.name + '</span></li>')
               .attr("id", topic.id).attr("viewpoint", topic.viewpoint).attr("uri", topic.uri);
      $('ul#topic').append(el);
    };
  }
  function TopicTree(){
    function radiobar(){
      var el = '<div id="topictree">'
		         + '<input type="radio" id="tt-cloud" name="topictree" /><label for="tt-cloud">Tag Cloud</label>'
		         + '<input type="radio" id="tt-tree" name="topictree" checked="checked" /><label for="tt-tree">Tree</label>'
		         + '</div>';
    		  $("#topic-tree-dialog").nextAll('div.ui-dialog-buttonpane').prepend(el);
    		  $( "#topictree" ).buttonset();
    		  $( "#tt-cloud" ).button({ icons: {primary:'ui-icon-tag'} }).click(function(){ $('#tree').hide(); $('#tags').show(); });
    		  $( "#tt-tree" ).button({ icons: {primary:'ui-icon-bookmark'} }).click(function(){ $('#tree').show(); $('#tags').hide(); });
    };
    function showTagCloud(tags){
      $("#tags ul li").hide().remove();
      var max = 0;
      var min = 32768;
      for(var name in tags)
      {
        if(tags[name].size > max) max = tags[name].size;
        if(tags[name].size < min) min = tags[name].size;
      }
      $.log("max:" + max + ", min:" + min, 4);
      for(var name in tags)
      {
        var size = Math.round((tags[name].size - min) / (max-min) * 4) + 1;
        var content = $("<li class='tag" + size + "'><a>" + name + "</a></li>").attr("topics", JSON.stringify(tags[name].topics)).attr("name", name);
        $("#tags ul").append(content);
      }
      $("#tags ul li").tsort();
      $("#tags ul li a").click(function(){
        if($.agorae.session.ctrlPressed)
          $(this).toggleClass('tag-clicked');
        else
        {
          $("#tags ul li a").removeClass('tag-clicked');
          $(this).addClass('tag-clicked');
        }
      });
    };
    function showTopicTree(tree){
      $.jstree._themes = 'css/jsTree/themes/';
      $("#tree").jstree({
        "json_data" : tree,
        "types" : $.agorae.topictree.jstree_types,
        "plugins" : [ "themes", "json_data", "ui", "crrm", "types" ]
      });
    };
    this.init = function(){
      $("#topic-tree-dialog").dialog({
        bgiframe: true,
        autoOpen: false,
        modal: true,
        width: 400,
        title: "Thèmes",
        close: function(){
          $("#tree").jstree('destroy');
        },
        open: function(){
          var uri = $.getUri();
          if(uri && uri.indexOf("/topic/") > 0)
          {
            var parts = uri.split("/");
            parts.pop();
            var viewpointID = parts.pop();
            parts.pop();
            parts.push("viewpoint");
            parts.push(viewpointID);
            uri = parts.join("/");
          }
          else
            uri = null;
          var topics = $.agorae.getTopicTree(uri);
          radiobar();
          showTopicTree(topics.tree);
          showTagCloud(topics.tagcloud);
        }
      });
    };
    this.openDialog = function(callback){
      $("#topic-tree-dialog").dialog('option', "buttons", {
          'Okay': callback,
          'Annuler': function(){
            $("#topic-tree-dialog").dialog('close');
          }
      }).dialog('open');
    };
    this.closeDialog = function(){
      $("#topic-tree-dialog").dialog('close');
    };
    this.jstree_types = {
      "valid_children" : [ "viewpoint" ],
      "types" : {
        "viewpoint": { "icon" : {  "image" : "css/blitzer/images/viewpoint.png"} },
        "topic": { "icon" : {  "image" : "css/blitzer/images/topic.png" } }
      }
    };
  }
  function ItemDialog(){
    this.init = function(){
      $("#item-dialog").dialog({
        bgiframe: true,
        autoOpen: false,
        modal: true,
        width: 500,
        title: "Rechercher Items",
        close: function(){
          //Clear search result
        },
        open: function(){
          $('#item-search-condition').html('<img src="css/blitzer/images/loading.gif" style="padding-left: 1em;">');
          $('#item-search-result').html('');
          //Init attribute name
          var names = $.agorae.getAttributeName();
          $.log(names);
        }
      });
    };
    this.open = function(callback){
      callback = callback || function(){};
      $("#item-dialog").dialog('option', "buttons", {
          'Rechercher': callback,
          'Annuler': function(){
            $("#item-dialog").dialog('close');
          }
      }).dialog('open');
    };
    this.close = function(callback){
      $("#item-dialog").dialog('close');
    };
    function showSearchCondition(){
    };
  }
  $.agorae = $.agorae || {};
  $.extend($.agorae, {
    session : new Session(),
    pagehelper : new PageHelper(),
    indexpage : new IndexPage(),
    viewpointpage : new ViewpointPage(),
    topicpage : new TopicPage(),
    itempage : new ItemPage(),
    topictree : new TopicTree(),
    itemdialog : new ItemDialog()
  });
})(jQuery);