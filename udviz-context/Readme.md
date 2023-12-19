## Installing and running this demonstration

The demonstration can be locally run using the following command :

```
npm install
npm run debug      
```

and then use your favorite (web) browser to open
`http://localhost:8000/`.

Note that technically the `npm run debug` command will use the [webpack-dev-server npm package](https://github.com/webpack/webpack-dev-server) that

- runs node application that in turn launched a vanilla http sever in local (on your desktop)
- launches a watcher (surveying changes in sources)
- in case of change that repacks an updated bundle
- that triggers a client (hot) reload

## Pre-requisites

As for any JavaScript application, the central building/running tool is [npm (Node Package Manager)](<https://en.wikipedia.org/wiki/Npm_(software)>) whose installation process is OS dependent:

- **Ubuntu**

  - Installation

    ```bash
    sudo apt-get install npm    ## Will pull NodeJS
    sudo npm install -g n
    sudo n latest
    ```

  - References: [how can I update Nodejs](https://askubuntu.com/questions/426750/how-can-i-update-my-nodejs-to-the-latest-version), and [install Ubuntu](http://www.hostingadvice.com/how-to/install-nodejs-ubuntu-14-04/#ubuntu-package-manager)

- **Windows**

  - Installing from the [installer](https://nodejs.org/en/download/)
  - Installing with the [CLI](https://en.wikipedia.org/wiki/Command-line_interface)

    ```bash
    iex (new-object net.webclient).downstring(‘https://get.scoop.sh’)
    scoop install nodejs
    ```
