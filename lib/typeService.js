const TYPE591 = {
    RENT: 'rent',
    SALE: 'sale',
    NEW_HOUSE: 'newhouse'
}

const getType591 = (url) => {
    if(url.includes(TYPE591.RENT)) {
        return TYPE591.RENT
    }
    else if(url.includes(TYPE591.SALE)) {
        return TYPE591.SALE
    }
    else if(url.includes(TYPE591.NEW_HOUSE)) {
        return TYPE591.NEW_HOUSE
    }
};

const getTypeId = (urlType,element) => {
    switch(urlType) {
        case TYPE591.RENT:
          const { post_id: postID } = element;
          return postID;
        case TYPE591.SALE:
          const { houseid: houseID } = element;
          return houseID;
        case TYPE591.NEW_HOUSE:
          const { hid: hID } = element;
          return hID;
      }
  };

const getReponseId = (urlType, responseData) => {
  switch(urlType) {
    case TYPE591.RENT:
      return responseData.data[0].post_id;
    case TYPE591.SALE:
      return responseData.house_list[0].houseid;
    case TYPE591.NEW_HOUSE:
      return responseData.items[0].hid;
  }
}

const getTypeUrl = (urlType,id) => {
    switch(urlType) {
        case TYPE591.RENT:
          return `\nhttps://rent.591.com.tw/rent-detail-${id}.html`;
        case TYPE591.SALE:
          return `\nhttps://sale.591.com.tw/home/house/detail/2/${id}.html`;
        case TYPE591.NEW_HOUSE:
          return `\nhttps://newhouse.591.com.tw/${id}`;
      }
  };

const getIdListAndElementList = (urlType, responseData) => {
    var elementList, idList;
    switch(urlType) {
        case TYPE591.RENT:
          const { data } = responseData;
          elementList=data
          idList = data.map((rentDetail) => rentDetail.post_id);
          break;
        case TYPE591.SALE:
          const { house_list } = responseData;
          elementList=house_list
          idList = elementList.map((houseDetail) => houseDetail.houseid);
          break;
        case TYPE591.NEW_HOUSE:
          const { items } = responseData;
          elementList=items
          idList = elementList.map((newHouseDetail) => newHouseDetail.hid);
          break;
      }
      return {elementList, idList};
}

module.exports = {
    get591Type: getType591,
    getTypeId: getTypeId,
    getReponseId: getReponseId,
    getTypeUrl: getTypeUrl,
    getIdListAndElementList: getIdListAndElementList,
};