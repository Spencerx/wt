/*
 * Copyright (C) 2008 Emweb bvba, Kessel-Lo, Belgium.
 *
 * See the LICENSE file for terms of use.
 */

#include "Wt/Dbo/Exception"

#include <boost/lexical_cast.hpp>

namespace Wt {
  namespace Dbo {

Exception::Exception(const std::string& error)
  : std::runtime_error(error)
{ }

StaleObjectException::StaleObjectException(const std::string& id, int version)
  : Exception("Stale object, id = " + id + ", version = "
	      + boost::lexical_cast<std::string>(version))
{ }

ObjectNotFoundException::ObjectNotFoundException(const std::string& id)
  : Exception("Object not found, id = " + id)
{ }

NoUniqueResultException::NoUniqueResultException()
  : Exception("Query: resultValue(): more than one result")
{ }
  }
}
