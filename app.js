const express = require('express');
const bodyParser = require('body-parser')
const graphqlHttp = require('express-graphql')
const { buildSchema } = require('graphql')
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config()
const url = process.env.DB_URL

const Event = require('./models/events');
const User = require('./models/user')
const app = express();


app.use(bodyParser.json());

app.use('/graphql', 
graphqlHttp({
    schema: buildSchema(`
    type Event {
        _id: ID!
        title: String!
        description: String!
        price: Float!
        date: String!
        creator: User!
    }

    type User {
        _id: ID!
        email: String!
        password: String
        createdEvents: [Event!]
    }



    input EventInput {
        title: String!
        description: String!
        price: Float!
        date: String!
    }

    input UserInput{
        email: String!
        password: String!
    }

    type RootQuery{
        events: [Event!]!

    }

    type RootMutation{
        createEvent(eventInput: EventInput): Event
        createUser(userInput: UserInput): User
    }


    schema{
        query: RootQuery
        mutation: RootMutation
    }`), 
    rootValue: {
        events: () => {
            return Event.find()
            .populate('creator')
            .then(events =>{
                return events.map(event => {
                    return { ...event._doc, _id: event.id, 
                    };
                    // is the same thing as line 67
                })
            }).catch(err =>{
                throw err;
            });
        },
        createEvent: (arg) => {
            const event = new Event ({
                title: arg.eventInput.title,
                description: arg.eventInput.description,
                price: arg.eventInput.price,
                date: new Date(arg.eventInput.date),
                creator: '5cbe1b8bb4a1e1220333a350' 
            });
            let createdEvent;
            return event
            .save()
            .then(result => {
                createdEvent = {... result._doc, _id: result._doc._id.toString()}
                return User.findById('5cbe1b8bb4a1e1220333a350')
                

            })
            .then(user => {
                if (!user) {
                throw new Error('User not found.')

            }
                user.createdEvents.push(event);
                return user.save();
                        
        
        })
            .then(result => {
                return createdEvent;
            })
            
            .catch(err => {
                console.log(err)
                throw err;
            });
            
            
        },
        createUser: args =>{
            return User.findOne({email: args.userInput.email}).then(user =>{
                if (user) {
                    throw new Error('User exists already.')

                }
                return bcrypt
            .hash(args.userInput.password, 12)
            })
            
            .then(hashedPassword => {
                const user = new User({
                    email: args.userInput.email,
                    password: hashedPassword
                
            });
            return user.save();
            })
            .then (result => {
                return {... result._doc,password: null, _id: result.id}
            })
            .catch(err => {
                throw err;
            });
            

        }
    },
    graphiql: true
}));

mongoose.connect(process.env.DB_URL
).then(() => {
    app.listen(3000);
}

).catch(err =>{
    console.log(err);
})


