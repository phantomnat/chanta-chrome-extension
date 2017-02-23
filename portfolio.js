function numberWithCommas(x) {
  const parts = x.toString().split('.')
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return parts.join('.')
}

let originStocks = []
let originCash = 0

let stocks = []
let portValue = 0
let posPortValue = 0
let cash = 0
let maxPortValue = 0
let sumExpectGain = 0
let $tbodyAdjustment = null
let sortKey = 'name'
let sortDirection = 1

/**
 * Read stocks data in portfolio
 */
function readStockDataInPort() {
  const $tablePerformance = $('table.performance-table tbody')
  const $tableFundamental = $('table.fundamental-table tbody')

  // reset data
  stocks = []
  portValue = 0
  sumExpectGain = 0
  posPortValue = 0
  // read data

  // Get basic stock data (price, shares, market value, ...)
  $tablePerformance.children().map((i, row) => {
    const $row = $(row)
    if ($row.hasClass('stock')) {
      const stock = {}
      $row.children().map((i, td) => {
        const $td = $(td)
        if (i === 0) stock.name = $td.data('sort')
        else if (i === 1) stock.symbol = $td.data('sort')
        else if (i === 2) stock.price = Number($td.html())
        else if (i === 3) stock.share = Number($td.data('sort'))
      })
      // stock.marketValue = stock.price * stock.share
      // portValue += stock.marketValue
      stocks.push(stock)
    } else if ($row.hasClass('sub-total')) {
      $row.children().map((i, td) => {
        const $td = $(td)
        if (i === 3) {
          cash = Number($td.html().replace(/,/, ''))
        }
      })
    }
  })

  // Get Jitta Line, Jitta Score, Expect Gain
  $tableFundamental.children().map((i, row) => {
    const $row = $(row)

    if ($row.hasClass('main')) {
      let symbol
      let jittaLine
      let jittaScore

      $row.children().map((i, td) => {
        const $td = $(td)
        if (i === 1) {
          // symbol
          symbol = $td.children('a').html()
        } else if (i === 2) {
          jittaScore = Number($td.html())
        } else if (i === 3) {
          // get jitta line
          let jl = $td.children('div').html()
          if (typeof jl === 'string' && !isNaN(Number(jl.replace(/%/, '')))) {
            jittaLine = Number(jl.replace(/%/, ''))
          }
          if (jittaLine && $td.children('div').hasClass('above')) {
            jittaLine *= -1
          }
        }
      })

      stocks.map((stock) => {
        if (stock.symbol === symbol) {
          stock.jittaLine = jittaLine
          stock.jittaScore = jittaScore
          stock.expectGain = stock.jittaLine * stock.jittaScore * 0.1
          sumExpectGain += (stock.jittaLine > 0) ? stock.expectGain : 0
          posPortValue += (stock.jittaLine > 0) ? stock.marketValue : 0
        }
      })
    }
  })

  stocks.map((stock) => {
    stock.marketValue = stock.price * stock.share
    portValue += stock.marketValue
  })

  maxPortValue = portValue + cash
  originCash = cash
  // clone object
  originStocks = JSON.parse(JSON.stringify(stocks))
}

/**
 * Create Adjustment Tab, Table
 */
function createAdjustmentUi() {
  const $ulNavTabContent = $('div#tab-summary div div.jui-tab-menu ul')
  const $tableTabContent = $('div#tab-summary div div.tab-content')

  // create `Adjustment` tab menu
  if (!$('div#tab-summary div div.jui-tab-menu ul li#li-tab-adjustment').length) {
    $ulNavTabContent.append(
      `<li role="presentation" id="li-tab-adjustment">` +
      `<a href="#tab-adjustment" role="tab" data-toggle="tab" aria-expanded="true">Adjustment</a>` +
      `</li>`
    )
  }

  // create adjustment table
  if (!$tbodyAdjustment) {
    $tableTabContent.append(
      `<div id="tab-adjustment" role="tabpanel" aria-labelledby="adjust-tab" class="tab-pane fade">` +
      `<table class="adjustment-table table jui-tablesort">` +
      `<thead>` +
      `<tr>` +
      `<th data-sort="name" class="name sort-header">Company Name</th>` +
      `<th data-sort="symbol" class="symbol sort-header">Symbol</th>` +
      `<th data-sort="price" class="price sort-header">Price</th>` +
      `<th data-sort="share" class="share sort-header">Shares</th>` +
      `<th data-sort="marketValue" class="value sort-header">Market Value</th>` +
      `<th data-sort="jittaLine" class="value sort-header">Jitta Line</th>` +
      `<th data-sort="jittaScore" class="value sort-header">Jitta Score</th>` +
      `<th data-sort="expectGain" class="value sort-header">Expect Gain</th>` +
      `<th data-sort="portRatio" class="value sort-header">Port Ratio</th>` +
      `<th data-sort="expectGainRatio" class="value sort-header">E.G. Ratio</th>` +
      `</tr>` +
      `</thead>` +
      `<tbody style="text-align: right">` +
      `</tbody>` +
      `</table>` +
      `</div>`
    )

    $tbodyAdjustment = $('div#tab-adjustment table tbody')

    $('div#tab-adjustment table thead tr th').click((event) => {
      $target = $(event.target)
      if ($target.data('sort')) {
        if ($target.hasClass('sort-up')) {
          $('div#tab-adjustment table thead tr th').removeClass('sort-up').removeClass('sort-down')
          $target.addClass('sort-down')
        } else {
          $('div#tab-adjustment table thead tr th').removeClass('sort-up').removeClass('sort-down')
          $target.addClass('sort-up')
        }
        sortKey = $target.data('sort')

        displayAdjustmentData()
      }
    })
  } else {
    $tbodyAdjustment.empty()
  }

  return $tbodyAdjustment
}

function getStockData(symbol) {
  let stock
  stocks.map((s) => {
    if (s.symbol === symbol) stock = s
  })
  return stock
}

function getOriginStockData(symbol) {
  let stock
  originStocks.map((s) => {
    if (s.symbol === symbol) stock = s
  })
  return stock
}

/**
 * Prepare data before display
 */
function prepareStockData() {
  let sumPortRatioOfNegEG = 0 // Sum port ratio of negative Expect Gain
  let portValueWithCash

  // sorting
  let $th = $(`div#tab-adjustment table thead tr th[data-sort="${sortKey}"]`)
  sortDirection = $th.hasClass('sort-up') ? 1 : -1

  // adjust data
  portValue = 0
  cash = maxPortValue

  return stocks
    .map((stock) => {
      stock.marketValue = stock.price * stock.share
      portValue += stock.marketValue
      cash -= stock.marketValue
      return stock
    })
    .map((stock) => {
      stock.portRatio = (stock.marketValue * 100) / (portValue + cash)
      if (stock.expectGain < 0) sumPortRatioOfNegEG += stock.portRatio
      return stock
    })
    .map((stock) => {
      stock.expectGainRatio = stock.expectGain < 0
        ? stock.portRatio
        : (stock.expectGain * (100 - sumPortRatioOfNegEG)) / (sumExpectGain)
      return stock
    })
    .sort((a, b) => ((a[sortKey] - b[sortKey]) * sortDirection))
}


/**
 * Display stocks data
 */
function displayAdjustmentData() {
  const stocks = prepareStockData()
  const portValueWithCash = portValue + cash
  const cashRatio = cash * 100 / portValueWithCash

  // clear table
  createAdjustmentUi()

  stocks.map((stock) => {
    const symbol = stock.symbol
    const portRatio = stock.portRatio
    const posGainPortRaio = stock.posGainPortRaio
    const expectGainRatio = stock.expectGainRatio
    const elemJittaLine = stock.jittaLine < 0
      ? `<td class="jitta-line"><div class="jitta-line-value above short">${stock.jittaLine.toFixed(2)}%</div></td>`
      : `<td class="jitta-line"><div class="jitta-line-value below short">${stock.jittaLine.toFixed(2)}%</div></td>`
    const elemEGRatio = stock.jittaLine < 0
      ? `<td data-sort="${stock.portRatio}" class="expect-gain-ratio">*${stock.portRatio.toFixed(2)}%</td>`
      : `<td data-sort="${stock.expectGainRatio}" class="expect-gain-ratio">${stock.expectGainRatio.toFixed(2)}%</td>`

    $tdShare = $(`<td data-sort="${stock.share}" class="share"></td>`)
    $divShare = $(`<div></div>`)
    $aShare = $(`<a data-symbol="${symbol}">${numberWithCommas(stock.share.toFixed(2))}</a>`)
    $aShare.click((event) => {
      $target = $(event.target)
      $parent = $target.parent()
      if ($target.data('symbol')) {
        const symbol = $target.data('symbol')
        const stock = getStockData(symbol)
        $input = $(`<input type="number" class="form-control share" style="max-width: 80px" value="${stock.share}"></input`)
        $input.focusout(() => {
          const _s = $input.val()
          stock.share = Number(_s)
          $parent.empty().append(`<a data-symbol="${symbol}">${numberWithCommas(stock.share.toFixed(2))}</a>`)
          displayAdjustmentData()
        })

        $input.keypress((e) => {
          if (e.which == 13) {
            const _s = $input.val()
            stock.share = Number(_s)
            $parent.empty().append(`<a data-symbol="${symbol}">${numberWithCommas(stock.share.toFixed(2))}</a>`)
            displayAdjustmentData()
          }
        })
        $parent.empty().append($input)
      }
    })
    $divShare.append($aShare)
    $tdShare.append($divShare)

    const orgStock = getOriginStockData(symbol)

    if (orgStock.share > stock.share) {
      $tdShare.append(`<span style="color: #fd726d">-${numberWithCommas((orgStock.share - stock.share).toFixed(2))}</span>`)
    } else if (orgStock.share < stock.share) {
      $tdShare.append(`<span style="color: #00bd9c">${numberWithCommas((stock.share - orgStock.share).toFixed(2))}</span>`)
    }

    $tr = $(`<tr class="stock"></tr>`)
    $tr.append(
      `<td data-sort="${stock.name}" class="name" style="text-align: left">${stock.name}</td>` +
      `<td data-sort="${symbol}" class="symbol" style="text-align: left"><a href="/stock/${symbol.toLowerCase()}" class="stock-link">${symbol}</a></td>` +
      `<td>${numberWithCommas(stock.price.toFixed(2))}</td>`
    )
    $tr.append($tdShare)
    $tr.append(
      `<td data-sort="${stock.marketValue}" class="market-value">${numberWithCommas(stock.marketValue.toFixed(2))}</td>` +
      elemJittaLine +
      `<td data-sort="${stock.jittaScore}" class="jitta-score">${stock.jittaScore.toFixed(2)}</td>` +
      `<td data-sort="${stock.expectGain}" class="expect-gain">${stock.expectGain.toFixed(2)}%</td>` +
      `<td data-sort="${stock.portRatio}" class="port-ratio">${stock.portRatio.toFixed(2)}%</td>` +
      elemEGRatio
    )

    $tbodyAdjustment.append($tr)
  })

  // cash
  let elemCash = `<td class="cash-market` +
    ((cash < 0) ? ` neg-value` : ``) +
    `"><div>${numberWithCommas(cash.toFixed(2))}</div>`

  if (originCash > cash) {
    elemCash += `<span class="neg-value">-${numberWithCommas((originCash - cash).toFixed(2))}</span>`
  } else if (originCash < cash) {
    elemCash += `<span class="pos-value">+${numberWithCommas((cash - originCash).toFixed(2))}</span>`
  }
  elemCash += `</td>`

  $tbodyAdjustment.append(
    `<tr class="no-sort sub-total">` +
    `<td class="title" style="text-align: left">Cash</td>` +
    `<td></td>` +
    `<td></td>` +
    `<td></td>` +
    elemCash +
    `<td></td>` +
    `<td></td>` +
    `<td></td>` +
    `<td><div>${cashRatio.toFixed(2)}%</div></td>` +
    `<td></td>` +
    `</tr>`
  )
}

function loadAdjustmentTab() {
  readStockDataInPort()

  displayAdjustmentData()
}

$(document).ready(() => {
  console.log('running `portfolio` script')

  const $divCol = $('div div div a.btn-add-transaction.btn.btn-primary').parent().parent().parent()
  $divCol.append(
    `<div class="col-md-14 form-inline text-right">` +
    `<a id="btn-reload-adjustment" class="btn-add-transaction btn btn-info">Reload</a>` +
    `</div>`
  )

  $('a#btn-reload-adjustment').click(() => {
    loadAdjustmentTab()
  })

  createAdjustmentUi()

  loadAdjustmentTab()
})

