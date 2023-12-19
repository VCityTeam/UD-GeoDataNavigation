export function findChildByID(element, childID) {
    for (let i = 0; i < element.children.length; i++) {
      const child = element.children[i];
      if (child.id == childID) {
        return child;
      }
      // check recursively
      const findInChild = findChildByID(child, childID);
      if (findInChild) return findInChild;
    }
  
    return null;
  }