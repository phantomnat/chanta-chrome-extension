function numberWithCommas(x) {
  var parts = x.toString().split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
}

function loadAdjustmentTab(sort = false) {
  console.log(`loadAdjustmentTab : ${sort}`)
  const $tablePerf = $('table.performance-table tbody')
  const $tableFund = $('table.fundamental-table tbody')

  const $ulNavTabContent = $('div#tab-summary div div.jui-tab-menu ul')
  const $tableTabContent = $('div#tab-summary div div.tab-content')

  const stocks = []
  let portValue = 0
  let posGainPortValue = 0
  let sumExpectGain = 0

  $tablePerf.children().each((i, row) => {
    const $row = $(row)
    if ($row.hasClass('stock')) {
      const stock = {}
      $row.children().map((i, td) => {
        const $td = $(td)
        if (i === 0) stock.name = $td.data('sort')
        else if (i === 1) stock.symbol = $td.data('sort')
        else if (i === 2) stock.price = Number($td.html())
        else if (i === 3) stock.share = Number($td.data('sort'))
        else if (i === 6) {
          stock.marketValue = Number($td.data('sort'))
          portValue += stock.marketValue
        }
      })
      stocks.push(stock)
    }
  })

  $tableFund.children().map((i, row) => {
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
      // console.log(`${symbol} - ${jittaScore} - ${jittaLine}`)

      stocks.map((stock) => {
        if (stock.symbol === symbol) {
          stock.jittaLine = jittaLine
          stock.jittaScore = jittaScore
          stock.expectGain = stock.jittaLine * stock.jittaScore * 0.1
          if (stock.expectGain > 0) {
            sumExpectGain += stock.expectGain
            posGainPortValue += stock.marketValue
          }
          // console.log(stock)
        }
      })
    }
  })

  // Build adjectment tab
  if (!$('div#tab-summary div div.jui-tab-menu ul li#li-tab-adjustment').length) {
    $ulNavTabContent.append(
      `<li role="presentation" id="li-tab-adjustment">` +
      `<a href="#tab-adjustment" role="tab" data-toggle="tab" aria-expanded="true">Adjustment</a>` +
      `</li>`
    )

    $('div#tab-summary div div.jui-tab-menu ul li#li-tab-adjustment a').click(() => {
      loadAdjustmentTab()
    })
  }

  let $tbodyAdjustment
  if (!$('div#tab-adjustment').length) {
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
        loadAdjustmentTab($target.data('sort'))
      }
    })
  } else {
    $tbodyAdjustment = $('div#tab-adjustment table tbody')
    $tbodyAdjustment.empty()
  }

  // adjust data
  let $th
  let sortKey = 'name'
  let sortDirection = 1
  if (sort) {
    sortKey = sort
    $th = $(`div#tab-adjustment table thead tr th[data-sort="${sort}"]`)
    console.log($th)
    if ($th.length) sortDirection = $th.hasClass('sort-up') ? 1 : -1
  }
  const sortedStocks = stocks.map((stock) => {
    // console.log(stock)
    const posGainPortRaion = (posGainPortValue * 100 / portValue)
    stock.portRatio = (stock.marketValue * 100) / portValue
    stock.expectGainRatio = stock.expectGain < 0
      ? stock.portRatio
      : (stock.expectGain * posGainPortRaion) / (sumExpectGain)
    return stock
  })
    .sort((a, b) => ((a[sortKey] - b[sortKey]) * sortDirection))
  
  // console.log(stocks)
  // console.log(sortedStocks)

  sortedStocks.map((stock) => {
    // const stock = sortedStocks[symbol]
    const symbol = stock.symbol
    const portRatio = stock.portRatio
    const posGainPortRaion = stock.posGainPortRaion
    const expectGainRatio = stock.expectGainRatio
    // const portRatio = (stock.marketValue * 100) / portValue
    // const posGainPortRaion = (posGainPortValue * 100 / portValue)
    // const expectGainRatio = stock.expectGain < 0 ? portRatio : (stock.expectGain * posGainPortRaion) / (sumExpectGain)
    const elemJittaLine = stock.jittaLine < 0
      ? `<td class="jitta-line"><div class="jitta-line-value above">${stock.jittaLine.toFixed(2)}%</div></td>`
      : `<td class="jitta-line"><div class="jitta-line-value below">${stock.jittaLine.toFixed(2)}%</div></td>`
    const elemEGRatio = stock.jittaLine < 0
      ? `<td data-sort="${expectGainRatio}" class="expect-gain-ratio">*${portRatio.toFixed(2)}%</td>`
      : `<td data-sort="${expectGainRatio}" class="expect-gain-ratio">${expectGainRatio.toFixed(2)}%</td>`

    $tbodyAdjustment.append(
      `<tr class="stock">` +
      `<td data-sort="${stock.name}" class="name" style="text-align: left">${stock.name}</td>` +
      `<td data-sort="${symbol}" class="symbol" style="text-align: left"><a href="/stock/${symbol.toLowerCase()}" class="stock-link">${symbol}</a></td>` +
      `<td>${numberWithCommas(stock.price.toFixed(2))}</td>` +
      `<td data-sort="${stock.share}" class="share">${numberWithCommas(stock.share.toFixed(2))}</td>` +
      `<td data-sort="${stock.marketValue}" class="market-value">${numberWithCommas(stock.marketValue.toFixed(2))}</td>` +
      elemJittaLine +
      `<td data-sort="${stock.jittaScore}" class="jitta-score">${stock.jittaScore.toFixed(2)}</td>` +
      `<td data-sort="${stock.expectGain}" class="expect-gain">${stock.expectGain.toFixed(2)}%</td>` +
      `<td data-sort="${portRatio}" class="port-ratio">${portRatio.toFixed(2)}%</td>` +
      elemEGRatio +
      `</tr>`
    )
  })
}

$(document).ready(() => {

  if (window.location.pathname === '/portfolio') {
    const $divButton = $('div div div a.btn-add-transaction.btn.btn-primary').parent()
    $divButton.append(
      `<a class="btn-add-transaction btn btn-info">Reload</a>`
    )
    $('div div div a.btn-add-transaction.btn.btn-info').click(() => {
      loadAdjustmentTab()
    })
    loadAdjustmentTab()
  }

})

