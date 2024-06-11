import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { createRoot } from "react-dom/client";
import "./index.css";
import { connect, message, createDataItemSigner } from "@permaweb/aoconnect";
import luaparse from "luaparse";
import { register, evaluate } from "./services.js";

const LoadingSpinner = () => (
  <div className="spinner-overlay">
    <div className="spinner">
      <div className="double-bounce1"></div>
      <div className="double-bounce2"></div>
    </div>
  </div>
);

const App = () => {
  const { result, results, spawn, monitor, unmonitor, dryrun } = connect({
    MU_URL: "https://ao-mu-1.onrender.com",
  });

  const banner = `
          _____                   _______                   _____
         /\\    \\                 /::\\    \\                 /\\    \\
        /::\\    \\               /::::\\    \\               /::\\    \\
       /::::\\    \\             /::::::\\    \\             /::::\\    \\
      /::::::\\    \\           /::::::::\\    \\           /::::::\\    \\
     /:::/\\:::\\    \\         /:::/~~\\:::\\    \\         /:::/\\:::\\    \\
    /:::/__\\:::\\    \\       /:::/    \\:::\\    \\       /:::/__\\:::\\    \\
   /::::\\   \\:::\\    \\     /:::/    / \\:::\\    \\      \\:::\\   \\:::\\    \\
  /::::::\\   \\:::\\    \\   /:::/____/   \\:::\\____\\   ___\\:::\\   \\:::\\    \\
 /:::/\\:::\\   \\:::\\    \\ |:::|    |     |:::|    | /\\   \\:::\\   \\:::\\    \\
/:::/  \\:::\\   \\:::\\____\\|:::|____|     |:::|    |/::\\   \\:::\\   \\:::\\____\\
\\::/    \\:::\\  /:::/    / \\:::\\    \\   /:::/    / \\:::\\   \\:::\\   \\::/    /
 \\/____/ \\:::\\/:::/    /   \\:::\\    \\ /:::/    /   \\:::\\   \\:::\\   \\/____/
          \\::::::/    /     \\:::\\    /:::/    /     \\:::\\   \\:::\\    \\
           \\::::/    /       \\:::\\__/:::/    /       \\:::\\   \\:::\\____\\
           /:::/    /         \\::::::::/    /         \\:::\\  /:::/    /
          /:::/    /           \\::::::/    /           \\:::\\/:::/    /
         /:::/    /             \\::::/    /             \\::::::/    /
        /:::/    /               \\::/____/               \\::::/    /
        \\::/    /                 ~~                      \\::/    /
         \\/____/                                           \\/____/
    `;

  const welcome = "Welcome to the ao Operating System.";
  const pid = "X22acRgedZXh-G0RnaJSjEIApyAzImmy3jDGiu0Lppo";
  const [loading, setLoading] = useState(false);
  const [walletAddress, setWalletAddress] = useState(null);
  const [process, setProcess] = useState(null);
  const [isArConnectInstalled, setIsArConnectInstalled] = useState(false);
  const [consoleOutput, setConsoleOutput] = useState([banner, welcome]);
  const [prompt, setPrompt] = useState("aos>");
  const [input, setInput] = useState("");
  const scrollableRef = useRef(null);

  useEffect(() => {
    const checkArConnect = () => {
      if (globalThis.arweaveWallet) {
        clearInterval(checkInterval);
        setIsArConnectInstalled(true);
        window.arweaveWallet
          .connect(["ACCESS_ADDRESS", "SIGN_TRANSACTION"])
          .then(() => window.arweaveWallet.getActiveAddress())
          .then((address) => {
            setWalletAddress(address);
            let ret = register(globalThis.arweaveWallet, address);
            console.log(ret);
            ret
              .toPromise()
              .then((pid) => {
                setProcess(pid);
              })
              .catch((error) => {
                console.error("Error:", error);
              });
          })
          .catch((error) => {
            console.error("Error connecting to ArConnect", error);
          });
      }
    };

    const checkInterval = setInterval(checkArConnect, 1000);

    // Cleanup interval on component unmount
    return () => clearInterval(checkInterval);
  }, []);

  useEffect(() => {
    // Scroll to the bottom whenever consoleOutput changes
    if (scrollableRef.current) {
      scrollableRef.current.scrollTop = scrollableRef.current.scrollHeight;
    }
  }, [consoleOutput]);

  const handleInputChange = (e) => {
    setInput(e.target.value);
  };

  const handleInput = async (e) => {
    if (!process) return;
    if (e.key === "Enter") {
      setConsoleOutput((prev) => [...prev, `${prompt} ${input}`]);
      setLoading(true);
      try {
        evaluate(input, process, globalThis.arweaveWallet)
          .then((ret) => {
            console.log(ret);
            if (ret.Error || ret.error) {
              let error = ret.Error || ret.error;
              setConsoleOutput((prev) => [...prev, error]);
            }
            if (ret.Output?.data?.output) {
              const ansiRegex = /\x1B\[([0-9]{1,2}(;[0-9]{1,2})?)?[mGK]/g;
              let r = String(ret.Output?.data?.output).replace(ansiRegex, "");
              console.log(r);
              setConsoleOutput((prev) => [...prev, r]);
            }
            if (ret.Output?.prompt) {
              setPrompt(ret.Output.prompt);
            }
            // setConsoleOutput(prev => [...prev, ret]);
            setLoading(false);
          })
          .catch((err) => {
            let e = JSON.stringify({ data: { output: err.message } });
            setConsoleOutput((prev) => [...prev, e]);
            setLoading(false);
          });
      } catch (error) {
        console.error(error);
        setConsoleOutput((prev) => [...prev, `Error: ${error.message}`]);
        setLoading(false);
      }
      setInput("");
    }
  };

  return (
    <div className="console">
      {loading && <LoadingSpinner />}
      <div className="info">
        {walletAddress ? (
          <p>Wallet Address: {walletAddress}</p>
        ) : (
          <p>Connecting to ArConnect...</p>
        )}
        {process ? <p>Your Process Id: {process}</p> : <p></p>}
      </div>
      <div className="console-output" ref={scrollableRef}>
        {consoleOutput.map((line, index) => (
          <pre className="console-output-lines" key={index}>
            {line}
          </pre>
        ))}
      </div>
      <div className="input">
        <input
          disabled={loading}
          type="text"
          className="console-input"
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleInput}
          placeholder={prompt}
        />
      </div>
    </div>
  );
};

const container = document.getElementById("root");
const root = createRoot(container); // createRoot(container!) if you use TypeScript
root.render(<App tab="home" />);
