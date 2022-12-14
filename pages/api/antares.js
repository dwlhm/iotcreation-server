import Cors from 'cors'

const cors = Cors({
    methods: ['POST', 'GET', 'HEAD'],
  })
  
  function runMiddleware(
    req,
    res,
    fn
  ) {
    return new Promise((resolve, reject) => {
      fn(req, res, (result) => {
        if (result instanceof Error) {
          return reject(result)
        }
  
        return resolve(result)
      })
    })
  }

export default async function handler(req, res) {
    
    await runMiddleware(req, res, cors)

    let data = ""
    let message = ""
    let error = ""

    let myHeaders = new Headers();
    myHeaders.append("X-M2M-Origin", "fb313a041380f589:4a8db2b214e50097");
    myHeaders.append("Content-Type", "application/json;ty=4");
    myHeaders.append("Accept", "application/json");

    let requestOptions = {
    method: 'GET',
    headers: myHeaders,
    redirect: 'follow'
    };

    await fetch("https://platform.antares.id:8443/~/antares-cse/antares-id/LORA22/LoRa/la", requestOptions)
    .then(response => response.json())
    .then(result => {
        message = "success"
        let dataJson = JSON.parse(result["m2m:cin"].con).data

        const pm1 = parseInt(dataJson.slice(0,4), 16);
        const pm25 = parseInt(dataJson.slice(4,8), 16);
        const pm10 = parseInt(dataJson.slice(8,12), 16);
        const temp = parseInt(dataJson.slice(12,16), 16)/100;
        const hum = parseInt(dataJson.slice(16,20), 16)/100;
        const flow = parseInt(dataJson.slice(20,24), 16)/100 || 0.003;

        data = `${pm1}:${pm25}:${pm10}:${temp}:${hum}:${flow}`

        let dataSensor = data.split(":")
        
        let ispu = [50, 100, 200, 300, 400, 500]
        let pm10Rule = [50, 150, 350, 420, 500, 600]
        let ispuStatus = [51, 101, 201, 301]
        let ispuVal = 0
        let status = 0

        for (let i = 0; i < pm10Rule.length; i++) {
            if (dataSensor[0] < pm10Rule[i]) {
                ispuVal = (
                                (
                                    (ispu[i] - (ispu[i-1] | 0))
                                    /
                                    (pm10Rule[i] - (pm10Rule[i-1] | 0))
                                )
                                *
                                (
                                    Number(dataSensor[0]) - (pm10Rule[i-1] | 0)
                                )
                                +
                                (ispu[i-1] | 0)
                            )
                break
            }
        }

        for (let i = 0; i < ispuStatus.length; i++) {
            if (ispuStatus[i] > ispuVal) {
                status = i + 1;
                break
            }
        }

        data += `:${status}`
    })
    .catch(error => {
        console.log('error', error)
        message = "error"
        error = error.toString()
    })

    res.status(message === "error" ? 500 : 200).json({
        message: message,
        data: data,
        error: error
    })
  }