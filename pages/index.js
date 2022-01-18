import React, {useEffect, useState} from 'react';
import twitterLogo from '../public/twitter-logo.png';
import './_app';
import idl from '../idl.json';
import {clusterApiUrl, Connection, PublicKey} from '@solana/web3.js';
import {Program, Provider, web3} from '@project-serum/anchor';
import kp from '../keypair.json'


// Constants
const TWITTER_HANDLE = 'solanacomicmeta';
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;
const TEST_GIFS = [
  'https://media4.giphy.com/media/0eM7G1bPuZCHxH2e6N/giphy.gif?cid=ecf05e47d9jsqp2am8edop8l1h0k9bmjy2xcly454gdpwexn&rid=giphy.gif&ct=g',
  'https://media3.giphy.com/media/3o6nUUWQhsTnwSQWJO/giphy.gif?cid=ecf05e47v2vqyo98ffke3oma3z1zaay3aux3efwvpkd0tm8p&rid=giphy.gif&ct=g',
  'https://media1.giphy.com/media/aYIW57no9afNfhLN5L/giphy.gif?cid=ecf05e479369bwtorxy7jhq0ut3ghjvke4au0gl2z1y5vnxx&rid=giphy.gif&ct=g',
  'https://media0.giphy.com/media/tA7onFOy9iubAJyZq8/giphy.gif?cid=ecf05e473bnw7bbrywlqysehj1oskezaxz7lf7mew6bwi8tu&rid=giphy.gif&ct=g'
]

// SystemProgram is a reference to the Solana runtime!
const { SystemProgram, Keypair } = web3;

// Create a keypair for the account that will hold the GIF data.
const arr = Object.values(kp._keypair.secretKey)
const secret = new Uint8Array(arr)
const baseAccount = web3.Keypair.fromSecretKey(secret)

// Get our program's id from the IDL file.
const programID = new PublicKey(idl.metadata.address);

// Set our network to devnet.
const network = clusterApiUrl('devnet');

// Controls how we want to acknowledge when a transaction is "done".
const opts = {
  preflightCommitment: "processed"
}

export default function Home()
{
  // State
  const [walletAddress, setWalletAddress] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [gifList, setGifList] = useState([]);

  const checkIfWalletIsConnected = async () => {
    try {
      const { solana } = window;

      if (solana) {
        if (solana.isPhantom) {
          console.log('Phantom wallet found!');

          /*
         * The solana object gives us a function that will allow us to connect
         * directly with the user's wallet!
         */
          const response = await solana.connect({onlyIfTrusted: true});
          console.log('Connected with Public Key:', response.publicKey.toString());

          /*
           * Set the user's publicKey in state to be used later!
           */
          setWalletAddress( response.publicKey.toString() );

        }
      } else {
        alert('Solana object not found! Get a Phantom Wallet 👻');
      }
    } catch (error) {
      console.error(error);
    }
  };

  /*
   * Let's define this method so our code doesn't break.
   * We will write the logic for this next!
   */
  const connectWallet = async () => {
    const { solana } = window;

    if (solana) {
      const response = await solana.connect();

      console.log('Connected with Public Key:', response.publicKey.toString());
      setWalletAddress(response.publicKey.toString());
    }
  };

  const sendGif = async () => {
    if (inputValue.length === 0) {
      console.log("No gif link given!");
      return;
    }
    setInputValue('');
    console.log('Gif link:', inputValue);
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);

      await program.rpc.addGif(inputValue, {
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey
        },
      });
      console.log("GIF successfully sent to program", inputValue)

      await getGifList();
    } catch (error) {
      console.log("Error sending GIF:", error);
    }
  };

  const onInputChange = (event) => {
    const { value } = event.target;
    setInputValue(value);
  };

  const getProvider = () => {
    const connection = new Connection(network, opts.preflightCommitment);
    return new Provider(connection, window.solana, opts.preflightCommitment);
  }


  const createGifAccount = async () => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);
      console.log("ping");
      await program.rpc.initialize({
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId
        },
        signers: [baseAccount]
      });
      console.log("Created a new BaseAccount w/ address:", baseAccount.publicKey.toString());
      await getGifList();

    } catch(error) {
      console.log("Error creating BaseAccount account:", error);
    }
  }

  /*
   * We want to render this UI when the user hasn't connected
   * their wallet to our app yet.
   */
  const renderNotConnectedContainer = () => (
      <button
          className="cta-button connect-wallet-button"
          onClick={connectWallet}>
        Connect to Wallet
      </button>
  );

  const renderConnectedContainer = () => {
    // If we hit this, it means the program account hasn't been initialized.
    if (gifList === null) {
      return (
          <div className="connected-container">
            <button className="cta-button submit-gif-button" onClick={createGifAccount}>
              Do One-Time Initialization For GIF Program Account
            </button>
          </div>
      )
    }
    // Otherwise, we're good! Account exists. User can submit GIFs.
    else {
      return(
          <div className="connected-container">
            <form
                onSubmit={(event) => {
                  event.preventDefault();
                  sendGif().then(r => console.log(r));
                }}
            >
              <input
                  type="text"
                  placeholder="Enter gif link!"
                  value={inputValue}
                  onChange={onInputChange}
              />
              <button type="submit" className="cta-button submit-gif-button">
                Submit
              </button>
            </form>
            <div className="gif-grid">
              {/* We use index as the key instead, also, the src is now item.gifLink */}
              {gifList.map((item, index) => (
                  <div className="gif-item" key={index}>
                    <img src={item.gifLink} />
                  </div>
              ))}
            </div>
          </div>
      )
    }
  }

  useEffect(() => {
    const onLoad = async () => {
      await checkIfWalletIsConnected();
    };
    window.addEventListener('load', onLoad);
    return () => window.removeEventListener('load', onLoad);
  }, []);

  const getGifList = async() => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);
      const account = await program.account.baseAccount.fetch(baseAccount.publicKey);

      console.log("Got the account", account)
      setGifList(account.gifList)

    } catch (error) {
      console.log("Error in getGifList: ", error)
      setGifList(null);
    }
  }

  useEffect(() => {
    if (walletAddress) {
      console.log('Fetching GIF list...');
      getGifList().then(r => console.log(r))
    }
  }, [walletAddress]);

  return (
      <div className="App">
        {/* This was solely added for some styling fanciness */}
        <div className={walletAddress ? 'authed-container' : 'container'}>
          <div className="header-container">
            <p className="header">🖼 Solana Sci-Fi GIF Portal</p>
            <p className="sub-text">
              A collection of random sci-fi GIFs ✨
            </p>
            {/* Render your connect to wallet button right here.
          Add the condition to show this only if we don't have a wallet address */}
            { !walletAddress && renderNotConnectedContainer() }
            { walletAddress && renderConnectedContainer() }
          </div>
          <div className="footer-container">
            <img alt="Twitter Logo" className="twitter-logo" src={twitterLogo} />
            <a
                className="footer-text"
                href={TWITTER_LINK}
                target="_blank"
                rel="noreferrer"
            >{`built on @${TWITTER_HANDLE}`}</a>
          </div>
        </div>
      </div>
  );
};

