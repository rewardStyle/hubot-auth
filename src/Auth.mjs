'use strict'

// Description
//   Assign roles to users and restrict command access in other scripts.
//
// Configuration:
//   HUBOT_AUTH_ADMIN - A comma separate list of user IDs
//
// Commands:
//   hubot <user> has <role> role - Assigns a role to a user
//   hubot <user> doesn't have <role> role - Removes a role from a user
//   hubot what roles does <user> have - Find out what roles a user has
//   hubot what roles do I have - Find out what roles you have
//   hubot who has <role> role - Find out who has the given role
//   hubot list assigned roles - List all assigned roles
//   hubot what is my name - Tells you your name from persistent storage
//   hubot what is my id - tells you your id from persistent storage
//
// Notes:
//   * Call the method: robot.auth.hasRole(msg.envelope.user,'<role>')
//   * returns bool true or false
//
//   * the 'admin' role can only be assigned through the environment variable
//   * roles are all transformed to lower case
//
//   * The script assumes that user IDs will be unique on the service end as to
//     correctly identify a user. Names were insecure as a user could impersonate
//     a user

const config = {
  admin_list: process.env.HUBOT_AUTH_ADMIN
}

export default (robot) => {
  if (!config.admin_list) {
    robot.logger.error('The HUBOT_AUTH_ADMIN environment variable not set')
  }

  let admins = []
  if (config.admin_list) {
    admins = config.admin_list.split(',')
  }

  class Auth {
    isAdmin (user) {
      return admins.includes(user.id.toString())
    }

    hasRole (user, roles) {
      const userRoles = this.userRoles(user)
      if (userRoles) {
        if (typeof roles === 'string') {
          roles = [roles]
        }
        for (const role of roles) {
          if (userRoles.includes(role)) {
            return true
          }
        }
      }
      return false
    }

    usersWithRole (role) {
      const users = []
      for (const key in robot.brain.data.users) {
        const user = robot.brain.data.users[key]
        if (this.hasRole(user, role)) {
          users.push(user.name)
        }
      }
      return users
    }

    userRoles (user) {
      let roles = []
      if (user && robot.auth.isAdmin(user)) {
        roles.push('admin')
      }
      if (user.roles) {
        roles = roles.concat(user.roles)
      }
      return roles
    }
  }

  robot.auth = new Auth()

  robot.respond(/@?(.+) ha(?:s|ve) (["'\w: -_]+) role/i, (msg) => {
    let name = msg.match[1].trim()
    if (name.toLowerCase() === 'i') {
      name = msg.message.user.name
    }
    if (name.match(/(.*)(?:don['’]t|doesn['’]t|do not|does not)/i)) return

    if (name.toLowerCase() !== '' && !['who', 'what', 'where', 'when', 'why'].includes(name.toLowerCase())) {
      if (!robot.auth.isAdmin(msg.message.user)) {
        msg.reply('Sorry, only admins can assign roles.')
      } else {
        const newRole = msg.match[2].trim().toLowerCase()

        const user = robot.brain.userForName(name)
        if (!user) return msg.reply(`${name} does not exist`)
        user.roles = user.roles || []

        if (user.roles.includes(newRole)) {
          msg.reply(`${name} already has the '${newRole}' role.`)
        } else {
          if (newRole === 'admin') {
            msg.reply("Sorry, the 'admin' role can only be defined in the HUBOT_AUTH_ADMIN env variable.")
          } else {
            user.roles.push(newRole)
            msg.reply(`OK, ${name} has the '${newRole}' role.`)
          }
        }
      }
    }
  })

  robot.respond(/@?(.+) (?:don['’]t|doesn['’]t|do not|does not) have (["'\w: -_]+) role/i, (msg) => {
    let name = msg.match[1].trim()
    if (name.toLowerCase() === 'i') {
      name = msg.message.user.name
    }

    if (name.toLowerCase() !== '' && !['who', 'what', 'where', 'when', 'why'].includes(name.toLowerCase())) {
      if (!robot.auth.isAdmin(msg.message.user)) {
        msg.reply('Sorry, only admins can remove roles.')
      } else {
        const newRole = msg.match[2].trim().toLowerCase()

        const user = robot.brain.userForName(name)
        if (!user) return msg.reply(`${name} does not exist`)
        user.roles = user.roles || []

        if (newRole === 'admin') {
          msg.reply("Sorry, the 'admin' role can only be removed from the HUBOT_AUTH_ADMIN env variable.")
        } else {
          user.roles = user.roles.filter(role => role !== newRole)
          msg.reply(`OK, ${name} doesn't have the '${newRole}' role.`)
        }
      }
    }
  })

  robot.respond(/what roles? do(es)? @?(.+) have\?*$/i, (msg) => {
    let name = msg.match[2].trim()
    if (name.toLowerCase() === 'i') {
      name = msg.message.user.name
    }
    const user = robot.brain.userForName(name)
    if (!user) return msg.reply(`${name} does not exist`)
    const userRoles = robot.auth.userRoles(user)

    if (userRoles.length === 0) {
      msg.reply(`${name} has no roles.`)
    } else {
      msg.reply(`${name} has the following roles: ${userRoles.join(', ')}.`)
    }
  })

  robot.respond(/who has (["'\w: -_]+) role\?*$/i, (msg) => {
    const role = msg.match[1]
    const userNames = robot.auth.usersWithRole(role)

    if (userNames.length > 0) {
      msg.reply(`The following people have the '${role}' role: ${userNames.join(', ')}`)
    } else {
      msg.reply('There are no people that have the \'${role}\' role.')
    }
  })

  robot.respond(/list assigned roles/i, (msg) => {
    const roles = []
    if (!robot.auth.isAdmin(msg.message.user)) {
      msg.reply('Sorry, only admins can list assigned roles.')
    } else {
      for (const key in robot.brain.data.users) {
        const user = robot.brain.data.users[key]
        if (user.roles) {
          for (const role of user.roles) {
            if (!roles.includes(role)) {
              roles.push(role)
            }
          }
        }
      }
      if (roles.length > 0) {
        msg.reply(`The following roles are available: ${roles.join(', ')}`)
      } else {
        msg.reply('No roles to list.')
      }
    }
  })

  robot.respond(/what(?:'s|s|\s+is)\s+my\s+name\s*(?:\?|)/i, (msg) => {
    const user = robot.brain.userForId(msg.envelope.user.id)
    if (!user || !user.name) {
      msg.reply('Your user could not be found in my Brain, sorry!')
      return
    }
    msg.reply(`Your name is: ${user.name}.`)
  })

  robot.respond(/what(?:'s|s|\s+is)\s+my\s+id\s*(?:\?|)/i, (msg) => {
    const user = robot.brain.userForId(msg.envelope.user.id)
    if (!user || !user.id) {
      msg.reply('Your user could not be found in my Brain, sorry!')
      return
    }
    msg.reply(`Your ID is: ${user.id}.`)
  })
}
