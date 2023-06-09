const app = require('express')()
const body_parser = require('body-parser')
const crypto = require('bcrypt')
const shortid = require('shortid')
const {gql, ApolloServer} = require('apollo-server-express')
const mongoose = require('mongoose')
const MistakeHandler = require('./libs/MistakeHandler')

// collections import

const Users = require('./models/Users')
const Orders = require('./models/Orders')
const Sleeps = require('./models/Sleeps')

const PORT = process.env.PORT || 4000
const uri = `mongodb+srv://Slavus54:N2aS4KlzCqUUYlmG@sib-eu-2023.sgs53ed.mongodb.net/Alarm-Map?retryWrites=true&w=majority`

// middlewares

app.use(getQueriesAccess)
app.use(body_parser.urlencoded({extended: true}))
app.use(body_parser.json({limit: '10mb'}))

function getQueriesAccess(req, res, next) {
    res.header("Access-Control-Allow-Origin",  "*")
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT")
    res.header("Access-Control-Allow-Headers", "Content-Type")

    next()
}

// database access

start_db()

async function start_db() {
    try {
        await mongoose.connect(uri, {
            useUnifiedTopology: true, useNewUrlParser: true
        })

        console.log('MongoDB already working')
    } catch (err) {
        console.log(MistakeHandler('mongo'))
    }
}

// graphql config

const typeDefs = gql`
    type Cord {
        lat: Float!,
        long: Float!
    }
    input Cords {
        lat: Float!,
        long: Float!
    }
    type Box {
        id: String!,
        title: String!,
        category: String!
    }
    input Boxs {
        id: String!,
        title: String!,
        category: String!
    }
    type UserInfo {
        name: String!,
        collectionId: String!
    }
    type Rate {
        criterion: String!,
        rate: Float!
    }
    input Rates {
        criterion: String!,
        rate: Float!
    }
    type Rating {
        name: String!,
        rates: [Rate]!,
        review: String!
    }
    type Chat {
        name: String!,
        variant: String!,
        text: String!
    }
    type Impression {
        id: String!,
        impression: String!,
        category: String!,
        dot: Cord!,
        link: String!
    }
    input Impressions {
        id: String!,
        impression: String!,
        category: String!,
        dot: Cords!,
        link: String!
    }
    type Question {
        id: String!,
        question: String!,
        impression: String!,
        level: String!,
        choices: [String]!,
        answer: String!
    }
    type Sleep {
        id: ID!,
        shortid: String!,
        creator: String!,
        title: String!,
        level: String!,
        region: String!,
        cords: Cord!,
        impressions: [Impression]!, 
        dateUp: String!,
        time_start: String!,
        total: Float!,
        rating: [Rating]!,
        questions: [Question]!
    }
    type Call {
        id: String!,
        call: String!,
        sound_level: String!,
        time_start: String!
    }
    input Calls {
        id: String!,
        call: String!,
        sound_level: String!,
        time_start: String!
    }
    type Order {
        id: ID!,
        shortid: String!,
        creator: String!,
        title: String!,
        category: String!,
        color: String!,
        calls: [Call]!,
        cost: Float!,
        region: String!,
        cords: Cord!,
        tel: String!,
        card: String!,
        isAccepted: Boolean!,
        dateUp: String!
    }
    type User {
        id: ID!,
        name: String!,
        email: String!,
        password: String!,
        age: Float!,
        sex: String!,
        location: Cord!,
        collectionId: String!,
        collection_boxes: [Box]!
    }
    type Query {
        hi: String!,
        look_users: [User]!
    }
    type Mutation {
        register(name: String!, email: String!, password: String!, age: Float!, sex: String!, location: Cords!) : UserInfo!
        login(name: String!, password: String!, collectionId: String!, key: String!) : UserInfo!
        getUserData(name: String!) : User!
        createOrder(name: String!, id: String!, title: String!, category: String!, color: String!, calls: [Calls]!, cost: Float!, region: String!, cords: Cords!, tel: String!, card: String!) : String!
        getOrders(name: String!) : [Order]!
        getOrder(name: String!, shortid: String!) : Order!
        updateOrderCalls(name: String!, id: String!, calls: [Calls]!, cost: Float!) : String!
        updateOrderStatus(name: String!, id: String!, dateUp: String!) : String!
        createSleep(name: String!, id: String!, title: String!, level: String!, region: String!, cords: Cords!, impressions: [Impressions]!, dateUp: String!, time_start: String!, total: Float!) : String!
        getSleeps(name: String!) : [Sleep]!
        getSleep(name: String!, shortid: String!) : Sleep!
        rateSleep(name: String!, id: String!, rates: [Rates]!, review: String!) : String!
        manageSleepQuestion(name: String!, id: String!, option: String!, question: String!, impression: String!, level: String!, choices: [String]!, answer: String!, collectionId: String!) : String!
        updateSleepImpression(name: String!, id: String!, collectionId: String!, link: String!) : String!
    }
`

const resolvers = {
    Query: {
        hi: () => 'Hello World!',
        look_users: async () => {
            let users = await Users.find()
            
            return users
        }
    },
    Mutation: {
        register: async (_, {name, email, password, age, sex, location}) => {
            const user = await Users.findOne({name})
   
            if (user === null) {

                const iden = await shortid.generate().toString()

                const newUser = new Users({
                    name,
                    email,
                    password,
                    age,
                    sex,
                    location,
                    collectionId: iden,
                    collection_boxes: []
                })

                await newUser.save()

                return {name, collectionId: iden}
            }
        },
        login: async (_, {name, password, collectionId, key}) => {
            const user = key === 'password' ? await Users.findOne({name, password}) : await Users.findOne({name, collectionId})

            if (user) {

                return {name, collectionId: user.collectionId}
            }
        },
        getUserData: async (_, {name}) => {
            const user = await Users.findOne({name})

            if (user) {

                return user
            }
        },
        createOrder: async (_, {name, id, title, category, color, calls, cost, region, cords, tel, card}) => {
            const user = await Users.findOne({name, collectionId: id})
            const order = await Orders.findOne({creator: name, title, category, color, calls, cost, region, cords, tel, card})

            if (user && !order) {
                if (user.collection_boxes.filter(el => el.category === 'order').find(el => el.title === title) === undefined) {

                    const iden = await shortid.generate().toString()

                    user.collection_boxes = [...user.collection_boxes, {
                        id: iden,
                        title,
                        category: 'order'
                    }]

                    const newOrder = new Orders({
                        shortid: iden,
                        creator: user.name,
                        title,
                        category,
                        color,
                        calls,
                        cost,
                        region,
                        cords,
                        tel,
                        card,
                        isAccepted: false,
                        dateUp:''
                    }) 

                    await Users.updateOne({name}, {$set: user})
                    await newOrder.save()

                    return 'Success'
                }
            }
        },
        getOrders: async (_, {name}) => {
            const order = await Orders.find()

            return order
        },
        getOrder: async (_, {name, shortid}) => {
            const order = await Orders.findOne({shortid})

            return order
        },
        updateOrderCalls: async (_, {name, id, calls, cost}) => {
            const user = await Users.findOne({name})
            const order = await Orders.findOne({shortid: id})

            if (user && order && user.name === order.creator && !order.isAccepted) {

                order.calls = calls
                order.cost = cost

                await Orders.updateOne({shortid: id}, {$set: order})

                return 'Success'
            }
        },
        updateOrderStatus: async (_, {name, id, dateUp}) => {
            const user = await Users.findOne({name})
            const order = await Orders.findOne({shortid: id})

            if (user && order) {

                order.isAccepted = !order.isAccepted
                order.dateUp = dateUp

                await Orders.updateOne({shortid: id}, {$set: order})

                return 'Success'
            }
        },
        createSleep: async (_, {name, id, title, level, region, cords, impressions, dateUp, time_start, total}) => {
            const user = await Users.findOne({name, collectionId: id})
            const sleep = await Sleeps.findOne({creator: name, title, level, region, cords, impressions, dateUp, time_start, total})
       
            if (user && !sleep) {
                if (user.collection_boxes.filter(el => el.category === 'sleep').find(el => el.title === title) === undefined) {

                    const iden = await shortid.generate().toString()

                    user.collection_boxes = [...user.collection_boxes, {
                        id: iden,
                        title,
                        category: 'sleep'
                    }]                 

                    const newSleep = new Sleeps({
                        shortid: iden,
                        creator: user.name,
                        title,
                        level,
                        region,
                        cords,
                        impressions, 
                        dateUp,
                        time_start,
                        total,
                        rating: [],
                        questions: []
                    })

                    await Users.updateOne({name}, {$set: user})
                    await newSleep.save()

                    return 'Success'
                }
            }
        },
        getSleeps: async (_, {name}) => {
            const sleep = await Sleeps.find()

            return sleep
        },
        getSleep: async (_, {name, shortid}) => {
            const sleep = await Sleeps.findOne({shortid})

            return sleep
        },
        rateSleep: async (_, {name, id, rates, review}) => {
            const user = await Users.findOne({name})
            const sleep = await Sleeps.findOne({shortid: id})
        
            if (user && sleep && user.name !== sleep.creator) {
                if (sleep.rating.find(el => el.name === user.name) === undefined) {

                    sleep.rating = [...sleep.rating, {
                        name: user.name,
                        rates,
                        review
                    }]

                    await Sleeps.updateOne({shortid: id}, {$set: sleep})

                    return 'Success'
                }
            }
        },
        manageSleepQuestion: async (_, {name, id, option, question, impression, level, choices, answer, collectionId}) => {
            const user = await Users.findOne({name})
            const sleep = await Sleeps.findOne({shortid: id})
        
            if (user && sleep) {
                if (option === 'add') {
                    if (sleep.questions.find(el => el.question === question) === undefined) {

                        const iden = await shortid.generate().toString()

                        sleep.questions = [...sleep.questions, {
                            id: iden,
                            question,
                            impression,
                            level,
                            choices,
                            answer 
                        }]
                    }
                } else {

                    sleep.questions = sleep.questions.filter(el => el.id !== collectionId)
                }

                await Sleeps.updateOne({shortid: id}, {$set: sleep})

                return 'Success'
            }
        },
        updateSleepImpression: async (_, {name, id, collectionId, link}) => {
            const user = await Users.findOne({name})
            const sleep = await Sleeps.findOne({shortid: id})

            if (user && sleep && user.name === sleep.creator) {

                sleep.impressions.map(el => {
                    if (el.id === collectionId) {
                        el.link = link
                    }
                })

                await Sleeps.updateOne({shortid: id}, {$set: sleep})

                return 'Success'
            }
        },
       
        
       
       


    }
}

const server = new ApolloServer({typeDefs, resolvers})

start_gql()

async function start_gql() {
    try {
        await server.start()
        await server.applyMiddleware({app}) 
    } catch (err) {
        console.log(MistakeHandler('apollo'))
    }   
}

// server starting

app.listen(PORT, () => console.log('Server started on port' + ' ' + PORT))