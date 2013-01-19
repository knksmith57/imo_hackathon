/*
* imo Hackathon Playground
* Jarvis == Just a very intelligent system
* Kyle Smith @knksmith57
*/

var

app = {

   // app vars
   channel : null,
   user : null,
   users : null,

   // DOM vars
   $usersList : null,
   $chat : null,

   // app methods
   log_in : function() {
      
      var that = this;
      
      // set up the user
      //    -username
      //    -info
      //    -profile pic?
      that.user = {
         first_name : "Kyle",
         last_name : "Smith",
         id : that.channel.get_public_client_id(),
         icon_url : "http://www.gravatar.com/avatar/fed2e6b32b1922e305c0de7a80a3a212.png" // or could use localhost for this
      }
      

      that.users = new IMO.UserList({
         "title" : "Users",
         "public_client_id" : that.user.id
      });
      
      that.$usersList.append(that.users.div);
      

      // Subscribe to the chat event queue, to receive all past and future messages.
      that.channel.subscribe(
         [  // which queues to subscribe to / create if not existing yet?
            {
               "type": "event_queue", 
               "name": "chat"
            },
            {
               "type" : "event_queue",
               "name" : "imo.clients"
            }
         ],   
         0  // min_stamp == starting point to receive messages from the queue. if negative, no past events will be sent
      );
      
      // Send a message announcing the user's arrival to all users.
      that.channel.event_queue(
         "chat", {
            "object": {
               "message": that.user.name + " joined the chat."
            }
         }
      );
   }, // end log_in

   send_message : function(userTo, messageText) {
      var that = this;

      // who am I sending it to?
      that.channel.event_queue(
         "chat-" + userTo, {         // which queue to send to? == "chat-user"
            "object" : {
               "message" : that.user.name + ": " + messageText
            }
         }
      );
   }, // end send_message

   connect : function() {
      var 
      that = this, res,
      client = {
         connect: function() {
            console.log("channel connected");

            // once connected, log in
            that.log_in();
         },

         event_queue: function(name, eventObj) {

            console.log("New event: " + name);

            // did a user just join / re-join?
            if (name == "imo.clients") {
               if (that.users.add_user(eventObj) == "join") {
                  console.log("New user: ")
                  console.log(eventObj)
               }
               else {
                  console.log("User returned: ")
                  console.log(eventObj)
               }
               
               // update my user data in the users list
               if(eventObj.setter == that.user.id) {
                  console.log("Setting my data! I'm " + that.user.id)
                  that.users.set_data(that.user.id, "first_name", that.user.first_name) 
                  that.users.set_data(that.user.id, "last_name", that.user.last_name) 
                  that.users.set_data(that.user.id, "icon_url", that.user.icon_url) 
               }
            }


            // was a message sent? to / from whom?
            else if ((res = /^chat-(.+)/i.exec(name)) && (eventObj.object.message)) {
               // just received a message, log it out!
               console.log(eventObj)

               // was this a message that I sent?
               var was_sent_by_me = eventObj.this_session;

               if(eventObj.object.message == "") {
                  console.log("empty message!");
                  return;
               }

               $("#chat_box").append(eventObj.object.message + "\n");

               if( ! was_sent_by_me ) {
                  // somebody just sent me a message, get it jarvis!
               }
            }
         },

         subscribe_done : function() {
            console.log("chat queue is up to date!");
         }
      };

      return new IMO.Channel(client);
   }, // end connect

   init : function() {
      var that = this;

      // set up DOM connections
      that.$chat = $("#chat_box");
      that.$usersList = $("#users_list_container");
      
      // Connect to the API channel.
      that.channel = that.connect();
      that.channel.debug_mode(true);
   } // end init
}


$(function() {
   // on doc ready, init app
   app.init();
})
